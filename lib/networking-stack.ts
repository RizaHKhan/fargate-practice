import { Stack, StackProps } from 'aws-cdk-lib'
import {
    DefaultInstanceTenancy,
    IpAddresses,
    IpProtocol,
    Ipv6Addresses,
    Peer,
    Port,
    SecurityGroup,
    SubnetType,
    Vpc,
} from 'aws-cdk-lib/aws-ec2'
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { Construct } from 'constructs'

export class NetworkingStack extends Stack {
    vpc: Vpc
    dbSecurityGroup: SecurityGroup
    lbSecurityGroup: SecurityGroup
    loadBalancer: ApplicationLoadBalancer

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        this.vpc = new Vpc(this, 'FargateVpc', {
            vpcName: 'FargateNetworkingVpc',
            maxAzs: 2,
            ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
            defaultInstanceTenancy: DefaultInstanceTenancy.DEFAULT,
            ipProtocol: IpProtocol.DUAL_STACK,
            ipv6Addresses: Ipv6Addresses.amazonProvided(),
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: SubnetType.PUBLIC, // This will create a internet gateway for us.
                },
                {
                    cidrMask: 24,
                    name: 'AppSubet',
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: 'DbSubet',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
            natGateways: 1,
            enableDnsHostnames: true,
            enableDnsSupport: true,
        })

        // Database secruity group
        this.dbSecurityGroup = new SecurityGroup(this, 'DbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for RDS instance',
        })

        this.dbSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(3306),
            'Allow MySQL access from anywhere'
        )

        // Load balancer
        this.lbSecurityGroup = new SecurityGroup(this, 'LbSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for ALB',
        })

        this.lbSecurityGroup.addIngressRule(
            Peer.anyIpv4(),
            Port.tcp(80),
            'Allow HTTP traffic from anywhere'
        )

        this.loadBalancer = new ApplicationLoadBalancer(
            this,
            'FargateApplicationLoadBalancer',
            {
                vpc: this.vpc,
                internetFacing: true,
                securityGroup: this.lbSecurityGroup,
            }
        )
    }
}
