import { Stack, StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface FargateServiceStackProps extends StackProps {
  repository: Repository;
  vpc: Vpc;
}

export class FargateServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, "FargateCluster", {
      vpc: props.vpc,
      clusterName: "FargateCluster",
    });

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: new Role(this, "FargateTaskExecutionRole", {
        assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonECSTaskExecutionRolePolicy",
          ),
          ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonEC2ContainerRegistryReadOnly",
          ),
        ],
      }),
    });

    taskDefinition.addContainer("AppContainer", {
      image: ContainerImage.fromEcrRepository(props.repository),
      portMappings: [{ containerPort: 3000 }],
    });

    const service = new ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      taskDefinition,
      assignPublicIp: true,
      publicLoadBalancer: true,
      desiredCount: 1,
      listenerPort: 80, // ALB listens on 80
      taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });
  }
}
