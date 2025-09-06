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
} from 'aws-cdk-lib/aws-ec2'
import { CfnOutput } from 'aws-cdk-lib'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'

interface DatabasetackProps extends StackProps {
    vpc: Vpc
    securityGroup: SecurityGroup
}

export class DatabaseStack extends Stack {
    db: DatabaseInstance
    secrets: ISecret | undefined

    constructor(scope: Construct, id: string, props: DatabasetackProps) {
        super(scope, id, props)

        this.db = new DatabaseInstance(this, 'MariaDbInstance', {
            engine: DatabaseInstanceEngine.mariaDb({
                version: MariaDbEngineVersion.VER_10_6,
            }),
            instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            credentials: Credentials.fromGeneratedSecret('khanr'),
            publiclyAccessible: true,
            allocatedStorage: 20,
            databaseName: 'wordpress_db',
            removalPolicy: RemovalPolicy.DESTROY,
            securityGroups: [props.securityGroup],
        })

        this.secrets = this.db.secret!

        new CfnOutput(this, 'DBEndpoint', {
            value: this.db.dbInstanceEndpointAddress,
            description: 'Database endpoint address',
        })

        new CfnOutput(this, 'DBPort', {
            value: this.db.dbInstanceEndpointPort,
            description: 'Database port',
        })
    }
}
