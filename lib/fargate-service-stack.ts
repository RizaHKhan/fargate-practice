import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CodeBuildAction,
  EcsDeployAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  MountPoint,
} from "aws-cdk-lib/aws-ecs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  CompositePrincipal,
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface FargateServiceStackProps extends StackProps {
  vpc: Vpc;
}

export class FargateServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const nginxRepo = new Repository(this, "FargateNginxRepository", {
      repositoryName: "server",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const phpRepo = new Repository(this, "FargatePHPRepository", {
      repositoryName: "app",
      removalPolicy: RemovalPolicy.DESTROY,
    });

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

    taskDefinition.addVolume({
      name: 'www-data',
    });

    const appContainer = taskDefinition.addContainer("AppContainer", {
      image: ContainerImage.fromEcrRepository(phpRepo),
      portMappings: [{ containerPort: 9000 }],
    });

    const serverContainer = taskDefinition.addContainer("ServerContainer", {
      image: ContainerImage.fromEcrRepository(nginxRepo),
      portMappings: [{ containerPort: 80 }],
    });

    const mountPoint: MountPoint = {
      sourceVolume: 'www-data',
      containerPath: '/var/www/html',
      readOnly: false,
    };

    appContainer.addMountPoints(mountPoint);
    serverContainer.addMountPoints(mountPoint);

    const service = new ApplicationLoadBalancedFargateService(this, "Service", {
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
