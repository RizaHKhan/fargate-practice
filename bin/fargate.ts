#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import 'dotenv/config'
import { DistroStack } from '../lib/distro-stack'
import { NetworkingStack } from '../lib/networking-stack'
import { FargateServiceStack } from '../lib/service-stack'
import { RepositoryStack } from '../lib/repository-stack'
import { DatabaseStack } from '../lib/database-stack'
import { Secret as ECSSecret } from 'aws-cdk-lib/aws-ecs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { ClusterStack } from '../lib/cluster-stack'
import { TaskStack } from '../lib/task-stack'
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { RecordTarget } from 'aws-cdk-lib/aws-route53'

const app = new App()
const domain = 'modernartisans.xyz'

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
}

const networkStack = new NetworkingStack(app, 'NetworkingStack', {
    env,
})

const distroStack = new DistroStack(app, 'DistroStack', {
    env,
    prefix: 'Fargate',
    domain,
})

const dbStack = new DatabaseStack(app, 'DatabaseStack', {
    env,
    vpc: networkStack.vpc,
    securityGroup: networkStack.dbSecurityGroup,
})

const clusterStack = new ClusterStack(app, 'ClusterStack', {
    vpc: networkStack.vpc,
    prefix: 'Fargate',
    env,
})

const siteRepoStack = new RepositoryStack(app, 'SiteRepositoryStack', {
    env,
    name: 'FargateSiteRepository',
    repoName: 'site',
})

const siteTask = new TaskStack(app, 'SiteStack', {
    prefix: 'Site',
    env,
    repo: siteRepoStack.repo,
    environment: {
        WP_HOME: `https://${domain}`,
    },
    secrets: {
        DB_HOST: ECSSecret.fromSecretsManager(dbStack.db.secret!, 'host'),
        DB_NAME: ECSSecret.fromSecretsManager(dbStack.db.secret!, 'dbname'),
        DB_PASSWORD: ECSSecret.fromSecretsManager(
            dbStack.db.secret!,
            'password'
        ),
        DB_USER: ECSSecret.fromSecretsManager(dbStack.db.secret!, 'username'),
        AUTH_KEY: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'AUTH_KEY', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'AUTH_KEY',
                },
            })
        ),
        AUTH_SALT: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'AUTH_SALT', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'AUTH_SALT',
                },
            })
        ),
        LOGGED_IN_KEY: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'LOGGED_IN_KEY', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'LOGGED_IN_KEY',
                },
            })
        ),
        LOGGED_IN_SALT: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'LOGGED_IN_SALT', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'LOGGED_IN_SALT',
                },
            })
        ),
        NONCE_KEY: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'NONCE_KEY', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'NONCE_KEY',
                },
            })
        ),
        NONCE_SALT: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'NONCE_SALT', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'NONCE_SALT',
                },
            })
        ),
        SECURE_AUTH_KEY: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'SECURE_AUTH_KEY', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'SECURE_AUTH_KEY',
                },
            })
        ),
        SECURE_AUTH_SALT: ECSSecret.fromSecretsManager(
            new Secret(siteRepoStack, 'SECURE_AUTH_SALT', {
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({}), // or provide other keys if needed
                    generateStringKey: 'SECURE_AUTH_SALT',
                },
            })
        ),
    },
})

const appRepoStack = new RepositoryStack(app, 'AppRepositoryStack', {
    env,
    name: 'FargateAppRepository',
    repoName: 'app',
})

const appTask = new TaskStack(app, 'AppStack', {
    prefix: 'App',
    env,
    repo: appRepoStack.repo,
    environment: {
        NODE_ENV: `https://app.${domain}`,
        APP_LOCALE: 'en',
        APP_DEBUG: 'false',
        APP_ENV: 'staging',
        APP_NAME: 'Laravel',
        APP_FAKER_LOCALE: 'en_US',
        APP_FALLBACK_LOCALE: 'en',
        DB_CONNECTION: 'mysql',
        DB_DATABASE: 'app_db',
        APP_KEY: 'base64:AHia+ZdPQAZH91dERYGJqgFAWJfRDWe40KIEaFPjNrI=', // WARN: Testing purposes, to remove
    },
    secrets: {
        DB_HOST: ECSSecret.fromSecretsManager(dbStack.db.secret!, 'host'),
        DB_PASSWORD: ECSSecret.fromSecretsManager(
            dbStack.db.secret!,
            'password'
        ),
        DB_PORT: ECSSecret.fromSecretsManager(dbStack.db.secret!, 'port'),
        DB_USERNAME: ECSSecret.fromSecretsManager(
            dbStack.db.secret!,
            'username'
        ),
    },
})

const siteService = new FargateServiceStack(app, 'FargateSiteServiceStack', {
    env,
    cluster: clusterStack.cluster,
    loadBalancer: networkStack.loadBalancer,
    prefix: 'site',
    repo: siteRepoStack.repo,
    taskDefinition: siteTask.taskDefinition,
    securityGroups: [networkStack.siteSg],
})

const appService = new FargateServiceStack(app, 'FargateAppServiceStack', {
    prefix: 'app',
    repo: appRepoStack.repo,
    env,
    cluster: clusterStack.cluster,
    taskDefinition: appTask.taskDefinition,
    loadBalancer: networkStack.loadBalancer,
    securityGroups: [networkStack.appSg],
})

const listener = networkStack.loadBalancer.addListener('Listener', {
    port: 80,
    open: true,
})

distroStack.setARecord(
    'SiteLoadBalancer',
    domain,
    RecordTarget.fromAlias({
        bind: () => ({
            dnsName: networkStack.loadBalancer.loadBalancerDnsName,
            hostedZoneId:
                networkStack.loadBalancer.loadBalancerCanonicalHostedZoneId,
        }),
    })
)

distroStack.setARecord(
    'LoadBalancer',
    `app.${domain}`,
    RecordTarget.fromAlias({
        bind: () => ({
            dnsName: networkStack.loadBalancer.loadBalancerDnsName,
            hostedZoneId:
                networkStack.loadBalancer.loadBalancerCanonicalHostedZoneId,
        }),
    })
)

listener.addTargets('DefaultTarget', {
    port: 80,
    targets: [siteService.service],
})

listener.addTargets('SiteTarget', {
    port: 80,
    conditions: [ListenerCondition.hostHeaders([domain])],
    targets: [siteService.service],
    priority: 1,
})

listener.addTargets('AppTarget', {
    port: 80,
    targets: [appService.service],
    conditions: [ListenerCondition.hostHeaders([`app.${domain}`])],
    priority: 2,
})
