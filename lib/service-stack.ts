import { Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr'

import { Cluster, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import {
    ApplicationLoadBalancer,
    ApplicationTargetGroup,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { FargateService } from 'aws-cdk-lib/aws-ecs'
import { Construct } from 'constructs'

interface FargateServiceStackProps extends StackProps {
    prefix: string
    repo: Repository
    cluster: Cluster
    taskDefinition: FargateTaskDefinition
    loadBalancer: ApplicationLoadBalancer
}

export class FargateServiceStack extends Stack {
    service: FargateService
    targetGroup: ApplicationTargetGroup

    constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
        super(scope, id, props)

        this.service = new FargateService(this, `Service-${props.prefix}`, {
            cluster: props.cluster,
            taskDefinition: props.taskDefinition,
            desiredCount: 1,
        })
    }
}
