import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../../proto/ml.proto');

export async function inferGrpc(req: any, mlHostOverride?: string): Promise<{ result_json: string }>{
  const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  const proto = (grpc.loadPackageDefinition(packageDef) as any);
  const mlHost = mlHostOverride || process.env.ML_GRPC_HOST || 'localhost:50051';
  const client = new proto.kimai.ml.v1.MlProcessor(mlHost, grpc.credentials.createInsecure());
  return new Promise((resolve, reject) => {
    client.Infer(req, (err: any, res: any) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}
