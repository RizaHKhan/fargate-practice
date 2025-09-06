import { Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import {
    ContainerImage,
    FargateTaskDefinition,
    LogDrivers,
} from 'aws-cdk-lib/aws-ecs'
import {
    Effect,
    ManagedPolicy,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

interface TaskStackProps extends StackProps {
    prefix: string
    repo: Repository
    environment?: { [key: string]: string }
    secrets?: { [key: string]: any }
}

export class TaskStack extends Stack {
    taskDefinition: FargateTaskDefinition

    constructor(scope: Construct, id: string, props: TaskStackProps) {
        super(scope, id, props)

        const executionRole = new Role(
            this,
            `FargateTaskExecutionRole-${props.prefix}`,
            {
                assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
                managedPolicies: [
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'service-role/AmazonECSTaskExecutionRolePolicy'
                    ),
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'AmazonEC2ContainerRegistryReadOnly'
                    ),
                    ManagedPolicy.fromAwsManagedPolicyName(
                        'AmazonSSMManagedInstanceCore' // Enables ECS Exec
                    ),
                ],
            }
        )

        executionRole.addToPolicy(
            new PolicyStatement({
                actions: ['ecs:ExecuteCommand', 'ecs:DescribeTasks'],
                resources: ['*'], // For least privilege, restrict to your ECS resources
            })
        )

        const taskRole = new Role(this, `TaskRole-${props.prefix}`, {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        })

        // Add permissions required for ECS Exec
        taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'ssmmessages:CreateControlChannel',
                    'ssmmessages:CreateDataChannel',
                    'ssmmessages:OpenControlChannel',
                    'ssmmessages:OpenDataChannel',
                ],
                resources: ['*'],
            })
        )

        this.taskDefinition = new FargateTaskDefinition(
            this,
            `TaskDefinition-${props.prefix}`,
            {
                memoryLimitMiB: 512,
                cpu: 256,
                executionRole,
                taskRole,
            }
        )

        this.taskDefinition.addContainer(`${props.prefix}-Container`, {
            image: ContainerImage.fromEcrRepository(props.repo),
            portMappings: [{ containerPort: 80 }],
            environment: props.environment,
            secrets: props.secrets,
            logging: LogDrivers.awsLogs({
                streamPrefix: props.prefix,
                logRetention: 7,
            }),
        })
    }
}
