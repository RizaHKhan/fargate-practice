import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53'
import {
    Certificate,
    CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager'
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'

interface DistroStackProps extends StackProps {
    prefix: string
    domain: string
}

export class DistroStack extends Stack {
    domain: string
    hostedZone: HostedZone

    constructor(scope: Construct, id: string, props: DistroStackProps) {
        super(scope, id, props)

        this.domain = props.domain
        this.hostedZone = new HostedZone(this, `${props.prefix}-HZ`, {
            zoneName: this.domain,
        })

        new Certificate(this, `${props.prefix}Certificate`, {
            domainName: this.domain,
            subjectAlternativeNames: [`*.${this.domain}`],
            validation: CertificateValidation.fromDns(this.hostedZone),
        })
    }

    setARecord(prefix: string, recordName: string, target: RecordTarget) {
        new ARecord(this, `${prefix}-ARecord`, {
            zone: this.hostedZone,
            recordName,
            target,
        })
    }
}
