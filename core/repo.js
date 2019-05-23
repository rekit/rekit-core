const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const download = require('download-git-repo');
const logger = require('./logger');

// Clone a repo to a folder, if folder not exists, create it.
function clone(gitRepo, destDir, errMsg) {
  fs.ensureDirSync(destDir);
  return new Promise((resolve, reject) => {
    const isDirect = /^https?:/.test(gitRepo);
    download(isDirect ? `direct:${gitRepo}` : gitRepo, destDir, { clone: isDirect }, err => {
      if (err) {
        console.log(
          errMsg ||
            'Failed to download the boilerplate. The project was not created. Please check and retry.',
        );
        logger.info(err);
        reject('CLONE_REPO_FAILED');
        return;
      }
      resolve();
    });
  });
}

// gitRepo: owner/repo#branch , only supports github.com.
// branch defaults to master
function sync(gitRepo, destDir) {
  return new Promise((resolve, reject) => {
    const arr = gitRepo.split('/');
    const owner = arr[0];
    const arr2 = arr[1].split('#');
    const repo = arr2[0];
    const branch = arr2[1] || 'master';
    // Get last commit to decide if it needs sync
    https
      .get(
        {
          hostname: 'api.github.com',
          path: `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
          port: 443,
          headers: { 'User-Agent': 'rekit-core' },
        },
        resp => {
          let data = '';

          // A chunk of data has been recieved.
          resp.on('data', chunk => {
            data += chunk;
          });

          resp.on('end', () => {
            try {
              const ref = JSON.parse(data);
              const lastCommit = ref.object.sha;
              if (!fs.existsSync(path.join(destDir, lastCommit))) {
                // If a file with the name of commit id doesn't exist, means not synced.
                fs.removeSync(destDir);
                clone(gitRepo, destDir)
                  .then(() => {
                    fs.writeFileSync(path.join(destDir, lastCommit), '');
                    resolve(lastCommit);
                  })
                  .catch(reject);
              } else {
                resolve();
              }
            } catch (err) {
              reject(err);
            }
          });
        },
      )
      .on('error', err => {
        logger.info('Failed to get last commit from: ' + gitRepo, err);
        reject('FAILED_CHECK_GIT_REPO_LATEST_COMMIT');
      });
  });
}

module.exports = {
  clone,
  sync,
};
