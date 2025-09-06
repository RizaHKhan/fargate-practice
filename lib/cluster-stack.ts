import { Stack, StackProps } from 'aws-cdk-lib'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Cluster } from 'aws-cdk-lib/aws-ecs'
import { Construct } from 'constructs'

interface ClusterStackProps extends StackProps {
    vpc: Vpc
    prefix: string
}

export class ClusterStack extends Stack {
    cluster: Cluster
    constructor(scope: Construct, id: string, props: ClusterStackProps) {
        super(scope, id, props)

        this.cluster = new Cluster(this, `FargateCluster-${props.prefix}`, {
            vpc: props.vpc,
            clusterName: `FargateCluster-${props.prefix}`,
        })
    }
}
