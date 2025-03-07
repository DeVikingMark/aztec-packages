import { Fr } from '@aztec/foundation/fields';

import { TxEffect } from './tx_effect.js';

describe('TxEffect', () => {
  it('converts to and from buffer', async () => {
    const txEffect = await TxEffect.random();
    const buf = txEffect.toBuffer();
    expect(TxEffect.fromBuffer(buf)).toEqual(txEffect);
  });

  it('converts to and from fields', async () => {
    const txEffect = await TxEffect.random();
    const fields = txEffect.toBlobFields();
    expect(TxEffect.fromBlobFields(fields)).toEqual(txEffect);
  });

  it('converts empty to and from fields', () => {
    const txEffect = TxEffect.empty();
    const fields = txEffect.toBlobFields();
    expect(TxEffect.fromBlobFields(fields)).toEqual(txEffect);
  });

  it('fails with invalid fields', async () => {
    let txEffect = await TxEffect.random();
    let fields = txEffect.toBlobFields();
    // Replace the initial field with an invalid encoding
    fields[0] = new Fr(12);
    expect(() => TxEffect.fromBlobFields(fields)).toThrow('Invalid fields');

    txEffect = await TxEffect.random();
    fields = txEffect.toBlobFields();
    // Add an extra field
    fields.push(new Fr(7));
    expect(() => TxEffect.fromBlobFields(fields)).toThrow('Too many fields');

    txEffect = await TxEffect.random();
    fields = txEffect.toBlobFields();
    const buf = Buffer.alloc(4);
    buf.writeUint8(6);
    buf.writeUint16BE(0, 2);
    // Add an extra field which looks like a valid prefix
    const fakePrefix = new Fr(buf);
    fields.push(fakePrefix);
    expect(() => TxEffect.fromBlobFields(fields)).toThrow('Invalid fields');
  });
});
