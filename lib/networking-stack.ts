import { Stack, StackProps } from "aws-cdk-lib";
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
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class NetworkingStack extends Stack {
  vpc: Vpc;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, "FargateVpc", {
      vpcName: "FargateNetworkingVpc",
      maxAzs: 2,
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      defaultInstanceTenancy: DefaultInstanceTenancy.DEFAULT,
      ipProtocol: IpProtocol.DUAL_STACK,
      ipv6Addresses: Ipv6Addresses.amazonProvided(),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: SubnetType.PUBLIC, // This will create a internet gateway for us.
        },
        {
          cidrMask: 24,
          name: "AppSubet",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    const albSg = new SecurityGroup(
      this,
      "ApplicationLoadBalancerSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for Application Load Balancer",
      },
    );

    albSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow HTTP traffic from anywhere",
    );

    const appSg = new SecurityGroup(this, "ApplicationSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Application",
    });

    appSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow HTTP traffic from anywhere",
    );
  }
}
