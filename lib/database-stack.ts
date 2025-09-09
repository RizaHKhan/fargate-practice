import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
    Credentials,
    DatabaseInstance,
    DatabaseInstanceEngine,
    MariaDbEngineVersion,
} from 'aws-cdk-lib/aws-rds'
import {
    InstanceType,
    InstanceClass,
    InstanceSize,
    SubnetType,
    Vpc,
    SecurityGroup,
    Instance,
    AmazonLinuxImage,
    AmazonLinuxGeneration,
} from 'aws-cdk-lib/aws-ec2'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'

interface DatabasetackProps extends StackProps {
    vpc: Vpc
    securityGroup: SecurityGroup
}

export class DatabaseStack extends Stack {
    db: DatabaseInstance
    secrets: ISecret | undefined
    adminInstance: Instance

    constructor(scope: Construct, id: string, props: DatabasetackProps) {
        super(scope, id, props)

        this.db = new DatabaseInstance(this, 'MariaDbInstance', {
            engine: DatabaseInstanceEngine.mariaDb({
                version: MariaDbEngineVersion.VER_10_6,
            }),
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS, // Use PRIVATE_WITH_EGRESS for private subnets
            },
            credentials: Credentials.fromGeneratedSecret('khanr'),
            publiclyAccessible: false, // Make DB private
            allocatedStorage: 20,
            databaseName: 'wordpress_db',
            removalPolicy: RemovalPolicy.DESTROY,
            securityGroups: [props.securityGroup],
        })

        this.secrets = this.db.secret!

        const ssmRole = new Role(this, 'DbAdminInstanceRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                    'AmazonSSMManagedInstanceCore'
                ),
            ],
        })

        this.adminInstance = new Instance(this, 'DbAdminInstance', {
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            },
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            machineImage: new AmazonLinuxImage({
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
            }),
            securityGroup: props.securityGroup, // Allows DB access
            role: ssmRole,
        })
    }
}
