import { Stack, StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
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
  repository: Repository;
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

    taskDefinition.addContainer("AppContainer", {
      image: ContainerImage.fromEcrRepository(props.repository),
      portMappings: [{ containerPort: 80 }],
      environment: {
        FARGATE_ENV: "from fargate service stack",
      },
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
