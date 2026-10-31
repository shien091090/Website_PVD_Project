// HogQL 的中文欄位名要加雙引號(單引號字串裡的中文不動)
export const quoteCJK = q => q.split(/('[^']*')/).map((part, i) => (i % 2 ? part : part.replace(/[一-鿿][一-鿿\w]*/g, w => `"${w}"`))).join('');
