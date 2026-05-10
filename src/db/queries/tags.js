import { query, run } from '../database'

export const getTags = () => query('SELECT * FROM tags ORDER BY name')

export const createTag = (name, color = '#64748b') =>
  run('INSERT INTO tags (name, color) VALUES (?,?)', [name, color])

export const updateTag = (id, name, color) =>
  run('UPDATE tags SET name=?, color=? WHERE id=?', [name, color, id])

export const deleteTag = (id) =>
  run('DELETE FROM tags WHERE id=?', [id])

export const setTransactionTags = (transactionId, tagIds) => {
  run('DELETE FROM transaction_tags WHERE transaction_id=?', [transactionId])
  for (const tagId of tagIds) {
    run('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?,?)', [transactionId, tagId])
  }
}
