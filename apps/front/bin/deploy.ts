import { App } from 'aws-cdk-lib'
import { environments } from './environments'
import { AppDeployStack } from './stack'

const region = process.env.AWS_REGION!
const account = process.env.ACCOUNT_ID!
const envVar = process.env.ENV!

const config = environments[envVar]

if (!config) throw new Error('No config found')

const app = new App()

const env = {
  region: region,
  account: account,
}

new AppDeployStack(app, `${envVar}-customer-portal`, {
  env,
  cloudFormantName: config.cloudFormantName,
})
