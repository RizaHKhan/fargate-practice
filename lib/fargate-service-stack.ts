import { Stack, StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  LogDrivers,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface FargateServiceStackProps extends StackProps {
  vpc: Vpc;
  app1Repo: Repository;
  app2Repo: Repository;
  phpRepo: Repository;
  proxyRepo: Repository;
}

export class FargateServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, "FargateCluster", {
      vpc: props.vpc,
      clusterName: "FargateCluster",
    });

    const executionRole = new Role(this, "FargateTaskExecutionRole", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy",
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly",
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore", // Enables ECS Exec
        ),
      ],
    });

    executionRole.addToPolicy(
      new PolicyStatement({
        actions: ["ecs:ExecuteCommand", "ecs:DescribeTasks"],
        resources: ["*"], // For least privilege, restrict to your ECS resources
      }),
    );

    const taskRole = new Role(this, "TaskRole", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Add permissions required for ECS Exec
    taskRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ],
        resources: ["*"],
      }),
    );

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole,
      taskRole,
    });


    taskDefinition.addContainer("ProxyContainer", {
      image: ContainerImage.fromEcrRepository(props.proxyRepo),
      portMappings: [{ containerPort: 80 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "proxy",
        logRetention: 7,
      }),
    });

    taskDefinition.addContainer("PhpContainer", {
      image: ContainerImage.fromEcrRepository(props.phpRepo),
      portMappings: [{ containerPort: 8080 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "php",
        logRetention: 7,
      }),
    });

    taskDefinition.addContainer("App1Container", {
      image: ContainerImage.fromEcrRepository(props.app1Repo),
      portMappings: [{ containerPort: 3000 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "app1",
        logRetention: 7,
      }),
    });

    taskDefinition.addContainer("App2Container", {
      image: ContainerImage.fromEcrRepository(props.app2Repo),
      portMappings: [{ containerPort: 3001 }],
      logging: LogDrivers.awsLogs({
        streamPrefix: "app2",
        logRetention: 7,
      }),
    });

    new ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      taskDefinition,
      assignPublicIp: true,
      publicLoadBalancer: true,
      desiredCount: 1,
      listenerPort: 80,
      taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      enableExecuteCommand: true,
    });
  }
}
