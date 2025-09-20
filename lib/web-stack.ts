import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import { Cluster, ContainerImage, FargateTaskDefinition, LogDrivers } from 'aws-cdk-lib/aws-ecs'
import { Secret as ECSSecret } from 'aws-cdk-lib/aws-ecs'
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds'
import { Construct } from 'constructs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'

interface WebStackProps extends StackProps {
    vpc: Vpc
    domain: string
    prefix: string
    db: DatabaseInstance
}

export class WebStack extends Stack {
    constructor(scope: Construct, id: string, props: WebStackProps) {
        super(scope, id, props)

        const cluster = new Cluster(this, `FargateCluster-${props.prefix}`, {
            vpc: props.vpc,
            clusterName: `FargateCluster-${props.prefix}`,
        })

        const siteRepo = new Repository(this, 'WordpressRepository', {
            repositoryName: 'WordpressRepository',
            removalPolicy: RemovalPolicy.DESTROY,
        })

        const siteTaskDefinition = new FargateTaskDefinition(
            this,
            `${props.prefix}-SiteTaskDefinition`,
            {
                memoryLimitMiB: 512,
                cpu: 256,
            }
        )

        siteTaskDefinition.addContainer(`${props.prefix}-SiteContainer`, {
            image: ContainerImage.fromEcrRepository(siteRepo),
            portMappings: [{ containerPort: 80 }],
            environment: {
                WP_HOME: `https://${props.domain}`,
            },
            secrets: {
                DB_HOST: ECSSecret.fromSecretsManager(
                    props.db.secret!,
                    'host'
                ),
                DB_NAME: ECSSecret.fromSecretsManager(
                    props.db.secret!,
                    'dbname'
                ),
                DB_PASSWORD: ECSSecret.fromSecretsManager(
                    props.db.secret!,
                    'password'
                ),
                DB_USER: ECSSecret.fromSecretsManager(
                    props.db.secret!,
                    'username'
                ),
                AUTH_KEY: ECSSecret.fromSecretsManager(
                    new Secret(this, 'AUTH_KEY', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'AUTH_KEY',
                        },
                    })
                ),
                AUTH_SALT: ECSSecret.fromSecretsManager(
                    new Secret(this, 'AUTH_SALT', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'AUTH_SALT',
                        },
                    })
                ),
                LOGGED_IN_KEY: ECSSecret.fromSecretsManager(
                    new Secret(this, 'LOGGED_IN_KEY', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'LOGGED_IN_KEY',
                        },
                    })
                ),
                LOGGED_IN_SALT: ECSSecret.fromSecretsManager(
                    new Secret(this, 'LOGGED_IN_SALT', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'LOGGED_IN_SALT',
                        },
                    })
                ),
                NONCE_KEY: ECSSecret.fromSecretsManager(
                    new Secret(this, 'NONCE_KEY', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'NONCE_KEY',
                        },
                    })
                ),
                NONCE_SALT: ECSSecret.fromSecretsManager(
                    new Secret(this, 'NONCE_SALT', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'NONCE_SALT',
                        },
                    })
                ),
                SECURE_AUTH_KEY: ECSSecret.fromSecretsManager(
                    new Secret(this, 'SECURE_AUTH_KEY', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'SECURE_AUTH_KEY',
                        },
                    })
                ),
                SECURE_AUTH_SALT: ECSSecret.fromSecretsManager(
                    new Secret(this, 'SECURE_AUTH_SALT', {
                        generateSecretString: {
                            secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                            generateStringKey: 'SECURE_AUTH_SALT',
                        },
                    })
                ),
            },
            logging: LogDrivers.awsLogs({
                streamPrefix: 'wordpress',
            }),
        })

        const appRepo = new Repository(this, 'LaravelRepository', {
            repositoryName: 'LaravelRepository',
            removalPolicy: RemovalPolicy.DESTROY,
        })
    }
}
