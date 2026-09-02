import type { Prisma } from '@prisma/client';
import type { ClassificationWriter } from '../application/classification.port';
import { visibleTransactionWhere } from './income-visibility.where';

/** Locks a bounded page before applying the shared visibility filter, preventing
 * a concurrent edit from changing eligibility between selection and SQL update. */
export async function writeClassificationPage(tx: Prisma.TransactionClient,
  ...[workspaceId, changes, ruleId, includeUnknown]: Parameters<NonNullable<ClassificationWriter['applyMany']>>) {
  if (!changes.length) return [];
  const ids = changes.map(({ id }) => id);
  const lockIds = JSON.stringify(ids.map((id) => ({ id })));
  await tx.$queryRaw`
    SELECT id FROM transactions WHERE workspace_id = ${workspaceId}::uuid
      AND id IN (SELECT item.id FROM jsonb_to_recordset(${lockIds}::jsonb) AS item(id text))
    ORDER BY id FOR UPDATE`;
  const rows = await tx.transaction.findMany({
    where: { id: { in: ids }, workspaceId, ...visibleTransactionWhere() },
    select: { id: true, classificationVersion: true, categoryOrigin: true, merchantOrigin: true },
  });
  const current = new Map(rows.map((row) => [row.id, row]));
  const replaceable = (origin: string) => origin !== 'MANUAL' && (includeUnknown || origin !== 'LEGACY_UNKNOWN');
  const eligible = changes.filter((item) => {
    const row = current.get(item.id);
    return row && row.classificationVersion === item.version &&
      (!item.change.changeCategory || replaceable(row.categoryOrigin)) &&
      (!item.change.changeMerchant || replaceable(row.merchantOrigin));
  });
  if (!eligible.length) return [];
  const payload = JSON.stringify(eligible.map(({ id, version, change }) => ({ id, version, ...change })));
  const updated = await tx.$queryRaw<{ id: string }[]>`
    UPDATE transactions AS t SET
      category = CASE WHEN item."changeCategory" THEN item.category ELSE t.category END,
      merchant = CASE WHEN item."changeMerchant" THEN item.merchant ELSE t.merchant END,
      category_origin = CASE WHEN item."changeCategory" THEN 'RULE' ELSE t.category_origin END,
      merchant_origin = CASE WHEN item."changeMerchant" THEN 'RULE' ELSE t.merchant_origin END,
      category_rule_id = CASE WHEN item."changeCategory" THEN ${ruleId} ELSE t.category_rule_id END,
      merchant_rule_id = CASE WHEN item."changeMerchant" THEN ${ruleId} ELSE t.merchant_rule_id END,
      merchant_key = item."merchantKey", merchant_identity_label = item."merchantIdentityLabel",
      classification_version = t.classification_version + 1, updated_at = CURRENT_TIMESTAMP
    FROM jsonb_to_recordset(${payload}::jsonb) AS item(id text, version integer, category text, merchant text,
      "changeCategory" boolean, "changeMerchant" boolean, "merchantKey" text, "merchantIdentityLabel" text)
    WHERE t.id = item.id AND t.workspace_id = ${workspaceId}::uuid AND t.classification_version = item.version
    RETURNING t.id`;
  return updated.map((row) => row.id);
}
