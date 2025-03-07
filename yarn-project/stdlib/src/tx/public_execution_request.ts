import { Fr } from '@aztec/foundation/fields';
import { BufferReader, serializeToBuffer } from '@aztec/foundation/serialize';
import type { FieldsOf } from '@aztec/foundation/types';

import { inspect } from 'util';
import { z } from 'zod';

import { computeVarArgsHash } from '../hash/index.js';
import { PublicCallRequest } from '../kernel/public_call_request.js';
import { type ZodFor, schemas } from '../schemas/index.js';
import { Vector } from '../types/index.js';
import { CallContext } from './call_context.js';

/**
 * The execution request of a public function.
 */
export class PublicExecutionRequest {
  constructor(
    /**
     * Context of the public call.
     */
    public callContext: CallContext,
    /**
     * Function arguments.
     */
    public args: Fr[],
  ) {}

  getSize() {
    return this.isEmpty() ? 0 : this.toBuffer().length;
  }

  toBuffer() {
    return serializeToBuffer(this.callContext, new Vector(this.args));
  }

  static get schema(): ZodFor<PublicExecutionRequest> {
    return z
      .object({
        callContext: CallContext.schema,
        args: z.array(schemas.Fr),
      })
      .transform(PublicExecutionRequest.from);
  }

  static fromBuffer(buffer: Buffer | BufferReader) {
    const reader = BufferReader.asReader(buffer);
    return new PublicExecutionRequest(CallContext.fromBuffer(reader), reader.readVector(Fr));
  }

  static from(fields: FieldsOf<PublicExecutionRequest>): PublicExecutionRequest {
    return new PublicExecutionRequest(...PublicExecutionRequest.getFields(fields));
  }

  static getFields(fields: FieldsOf<PublicExecutionRequest>) {
    return [fields.callContext, fields.args] as const;
  }

  static empty() {
    return new PublicExecutionRequest(CallContext.empty(), []);
  }

  static async random() {
    return new PublicExecutionRequest(await CallContext.random(), [Fr.random(), Fr.random()]);
  }

  isEmpty(): boolean {
    return this.callContext.isEmpty() && this.args.length === 0;
  }

  async isForCallRequest(callRequest: PublicCallRequest) {
    return (
      this.callContext.msgSender.equals(callRequest.msgSender) &&
      this.callContext.contractAddress.equals(callRequest.contractAddress) &&
      this.callContext.functionSelector.equals(callRequest.functionSelector) &&
      this.callContext.isStaticCall == callRequest.isStaticCall &&
      (await computeVarArgsHash(this.args)).equals(callRequest.argsHash)
    );
  }

  async toCallRequest(): Promise<PublicCallRequest> {
    return new PublicCallRequest(
      this.callContext.msgSender,
      this.callContext.contractAddress,
      this.callContext.functionSelector,
      this.callContext.isStaticCall,
      await computeVarArgsHash(this.args),
    );
  }

  [inspect.custom]() {
    return `PublicExecutionRequest {
      callContext: ${inspect(this.callContext)}
      args: ${this.args}
    }`;
  }
}
