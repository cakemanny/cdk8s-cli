import * as yargs from 'yargs';
import { readConfigSync, ImportSpec } from '../../config';
import { importDispatch } from '../../import/dispatch';
import { DEFAULT_API_VERSION } from '../../import/k8s';
import { parseImports } from '../../util';

const config = readConfigSync();

const DEFAULT_OUTDIR = 'imports';
const LANGUAGES = ['typescript', 'python', 'java', 'go'];

class Command implements yargs.CommandModule {
  public readonly command = 'import [SPEC]';
  public readonly describe = 'Imports API objects to your app by generating constructs.';
  public readonly aliases = ['gen', 'import', 'generate'];

  public readonly builder = (args: yargs.Argv) => args
    .positional('SPEC', { default: config?.imports, desc: 'import spec with the syntax [NAME:=]SPEC where NAME is an optional module name and supported SPEC are: k8s, crd.yaml, https://domain/crd.yaml, github:account/repo[@VERSION]).', array: true })
    .example('cdk8s import k8s', `Imports Kubernetes API objects to imports/k8s.ts. Defaults to ${DEFAULT_API_VERSION}`)
    .example('cdk8s import k8s --no-class-prefix', 'Imports Kubernetes API objects without the "Kube" prefix')
    .example('cdk8s import k8s@1.13.0', 'Imports a specific version of the Kubernetes API')
    .example('cdk8s import jenkins.io_jenkins_crd.yaml', 'Imports constructs for the Jenkins custom resource definition from a file')
    .example('cdk8s import mattermost:=mattermost_crd.yaml', 'Imports constructs for the mattermost cluster custom resource definition using a custom module name')
    .example('cdk8s import github:crossplane/crossplane@0.14.0', 'Imports constructs for a GitHub repo using doc.crds.dev')
    .example('cdk8s import helm:https://charts.bitnami.com/bitnami/mysql@9.10.10', 'Imports the specified version of helm chart')

    .option('save', { type: 'boolean', required: false, default: true, desc: "Dont save the import URL in the 'imports' section of the cdk8s.yaml configuration file.", alias: 's' })
    .option('output', { default: DEFAULT_OUTDIR, type: 'string', desc: 'Output directory', alias: 'o' })
    .option('exclude', { type: 'array', desc: 'Do not import types that match these regular expressions. They will be represented as the "any" type (only for "k8s")' })
    .option('class-prefix', { type: 'string', desc: 'A prefix to add to all generated class names. By default, this is "Kube" for "k8s" imports and disabled for CRD imports. Use --no-class-prefix to disable. Must be PascalCase' })
    .option('language', { default: config?.language, demand: true, type: 'string', desc: 'Output programming language', alias: 'l', choices: LANGUAGES });

  public async handler(argv: any) {
    const classNamePrefix = argv.classPrefix === false ? '' : argv.classPrefix;
    const imports: string[] = Array.isArray(argv.spec) ? argv.spec : [argv.spec];
    const specs: ImportSpec[] = imports.filter(spec => spec != null).map(parseImports);

    await importDispatch(specs, argv, {
      outdir: argv.output,
      targetLanguage: argv.language,
      classNamePrefix,
      save: argv.save,
    });
  }
}

module.exports = new Command();
