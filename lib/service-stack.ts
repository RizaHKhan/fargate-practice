import { Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import {
    Cluster,
    FargateService,
    FargateTaskDefinition,
} from 'aws-cdk-lib/aws-ecs'
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2'
import { Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction as LambdaTarget } from 'aws-cdk-lib/aws-events-targets'
import {
    ApplicationLoadBalancer,
    ApplicationTargetGroup,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'

interface FargateServiceStackProps extends StackProps {
    prefix: string
    repo: Repository
    cluster: Cluster
    taskDefinition: FargateTaskDefinition
    loadBalancer: ApplicationLoadBalancer
    securityGroups: SecurityGroup[]
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
            securityGroups: props.securityGroups,
        })

        const redeployLambda = new Function(
            this,
            `RedeployLambda-${props.prefix}`,
            {
                runtime: Runtime.NODEJS_18_X,
                handler: 'index.handler',
                code: Code.fromInline(`
                    const { ECSClient, UpdateServiceCommand } = require("@aws-sdk/client-ecs");
                    const client = new ECSClient();
                    exports.handler = async (event) => {
                        const command = new UpdateServiceCommand({
                            cluster: process.env.CLUSTER_NAME,
                            service: process.env.SERVICE_NAME,
                            forceNewDeployment: true
                        });

                        await client.send(command);
                    };
                `),
                environment: {
                    CLUSTER_NAME: props.cluster.clusterName,
                    SERVICE_NAME: this.service.serviceName,
                },
            }
        )

        redeployLambda.addToRolePolicy(
            new PolicyStatement({
                actions: ['ecs:UpdateService'],
                resources: [this.service.serviceArn],
            })
        )

        const rule = new Rule(this, `EcrPushRule-${props.prefix}`, {
            eventPattern: {
                source: ['aws.ecr'],
                detailType: ['ECR Image Action'],
                detail: {
                    'action-type': ['PUSH'],
                    'repository-name': [props.repo.repositoryName],
                    result: ['SUCCESS'],
                },
            },
        })

        rule.addTarget(new LambdaTarget(redeployLambda))
    }
}
