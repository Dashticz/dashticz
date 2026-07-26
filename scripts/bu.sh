BRANCH=`git rev-parse --abbrev-ref HEAD`
echo Current branch: $BRANCH
if [ $BRANCH = 'beta' ]
then
  echo 'Don''t do this on beta'
  exit 1
fi
if [ $BRANCH = 'master' ]
then
  echo 'Don''t do this on master.'
  exit 1
fi
git checkout beta
git fetch upstream beta
git merge upstream/beta
git branch -d $BRANCH
