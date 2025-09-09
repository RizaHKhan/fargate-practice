import { Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import {
    ContainerImage,
    FargateTaskDefinition,
    LogDrivers,
} from 'aws-cdk-lib/aws-ecs'
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

        this.taskDefinition = new FargateTaskDefinition(
            this,
            `TaskDefinition-${props.prefix}`,
            {
                memoryLimitMiB: 512,
                cpu: 256,
            }
        )

        this.taskDefinition.addContainer(`${props.prefix}-Container`, {
            image: ContainerImage.fromEcrRepository(props.repo),
            portMappings: [{ containerPort: 80 }],
            environment: props.environment,
            secrets: props.secrets,
            logging: LogDrivers.awsLogs({
                streamPrefix: props.prefix,
            }),
        })
    }
}
