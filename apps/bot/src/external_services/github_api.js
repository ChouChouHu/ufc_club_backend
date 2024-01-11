import rp from 'request-promise';

export function isPRValid(pr) {
  const baseBranch = pr.base.ref.toLowerCase();
  const compareBranch = pr.head.ref.toLowerCase();

  if (baseBranch === 'main') {
    postComment(
      pr.issue_url + '/comments',
      '不可以發 PR 到 main branch 喔！by Alban'
    );
    return false;
  } else if (baseBranch !== 'develop') {
    postComment(pr.issue_url + '/comments', '你把 PR 發到哪裡了？⋯⋯by Alban');
    return false;
  }

  if (!/^feature\/[a-zA-Z]+-w\d+p\d+$/.test(compareBranch)) {
    postComment(
      pr.issue_url + '/comments',
      '請檢查你的 compare branch 命名是否為 feature/[your_name]-w[week number]p[part number] 格式喔！by Alban'
    );
    return false;
  }
  return true;
}

export async function postComment(uri, content) {
  console.log('post comment to uri:', uri);
  const headers = {
    'User-Agent': 'request',
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  };
  const body = JSON.stringify({
    body: content,
  });
  await rp({ method: 'POST', uri, body: body, headers });
}
