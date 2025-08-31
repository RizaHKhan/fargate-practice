import { Stack, StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  LogDrivers,
  Secret,
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
  prefix: string;
  repo: Repository;
  secrets: { [key: string]: Secret };
  environment?: { [key: string]: string };
}

export class FargateServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, `FargateCluster-${props.prefix}`, {
      vpc: props.vpc,
      clusterName: `FargateCluster-${props.prefix}`,
    });

    const executionRole = new Role(
      this,
      `FargateTaskExecutionRole-${props.prefix}`,
      {
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
      },
    );

    executionRole.addToPolicy(
      new PolicyStatement({
        actions: ["ecs:ExecuteCommand", "ecs:DescribeTasks"],
        resources: ["*"], // For least privilege, restrict to your ECS resources
      }),
    );

    const taskRole = new Role(this, `TaskRole-${props.prefix}`, {
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

    const taskDefinition = new FargateTaskDefinition(
      this,
      `TaskDefinition-${props.prefix}`,
      {
        memoryLimitMiB: 512,
        cpu: 256,
        executionRole,
        taskRole,
      },
    );

    taskDefinition.addContainer(`${props.prefix}-Container`, {
      image: ContainerImage.fromEcrRepository(props.repo),
      portMappings: [{ containerPort: 80 }],
      environment: props.environment,
      secrets: props.secrets,
      logging: LogDrivers.awsLogs({
        streamPrefix: props.prefix,
        logRetention: 7,
      }),
    });

    new ApplicationLoadBalancedFargateService(this, `Service-${props.prefix}`, {
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
