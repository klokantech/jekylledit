import json
import os
import os.path
import yaml
from base64 import b64decode
import frontmatter

from contextlib import contextmanager
from subprocess import Popen, PIPE

import frontmatter


class Repository:

    def __init__(self, name):
        self.name = name

    def path(self, filename=None):
        directory = os.path.join('/var/www/jekylledit', self.name)
        if filename is None:
            return directory
        return os.path.normpath(os.path.join(directory, filename))

    def is_path_in(self, file):
        return self.path(file).startswith(self.path())

    def open(self, filename, mode):
        # Python in Docker has ASCII as default encoding.
        return open(self.path(filename), mode, encoding='utf-8')

    def remove(self, filename):
        # Python in Docker has ASCII as default encoding.
        return os.remove(self.path(filename))

    @contextmanager
    def transaction(self):
        head = self.execute(['rev-parse', '--verify', '-q', 'HEAD']).strip()
        try:
            yield self
        except:
            self.execute(['reset', '--hard', head])
            raise

    def execute(self, args):
        cmd = [
            'git',
            '--git-dir={}'.format(self.path('.git')),
            '--work-tree={}'.format(self.path()),
        ]
        cmd.extend(args)
        proc = Popen(cmd, stdin=PIPE, stdout=PIPE, stderr=PIPE)
        out, err = proc.communicate()
        if proc.returncode != 0:
            raise Exception(err)
        return out


class Sites:

    USERS_FILE = '_data/users.json'

    def __init__(self, name):
        self.name = name
        self.repository = Repository(name)

    def get_config(self, filename=None):
        if filename is None:
            filename = 'jekylledit.json'
        with self.repository.open(filename, 'r') as fp:
            self.config = json.load(fp)
            if 'languages' not in self.config:
                self.config.update({'languages': ['en']})
            return self.config

    def get_drafts(self, category=None):
        drafts = {}
        directory = self.repository.path(category)
        files = os.listdir(directory)
        files.sort()
        for f in files:
            filename = os.path.join(directory, f)
            with self.repository.open(filename, 'r') as fp:
                post = frontmatter.load(fp)
                if 'published' in post.metadata \
                and post.metadata['published'] is False:
                    fmask = f.rsplit('-', 1)[0] + '-__.' + f.rsplit('.', 1)[1]
                    if not drafts.get(fmask):
                        drafts[fmask] = {
                            'author': post.metadata['author'],
                            'category': category,
                            'date': post.metadata['date'],
                            'filename': os.path.join(category, fmask),
                            'title': post.metadata['title']
                        }
        return list(drafts.values())

    def get_users(self):
        with self.repository.open(self.USERS_FILE, 'r') as fp:
            users = json.load(fp)
            return users

    def get_user(self, user_id):
        users = self.get_users()
        user_data = {}
        for user in users:
            if user['id'] == user_id:
                user_data = user
                break
        return user_data

    def edit_user(self, data):
        with self.repository.open(self.USERS_FILE, 'r+') as fp:
            users = json.load(fp)
            for idx, user in enumerate(users):
                if user['id'] == data['id']:
                    users[idx] = data
                    break
            fp.seek(0)
            fp.truncate()
            json.dump(users, fp,
                      sort_keys=True, indent=2, separators=(',', ': '))

    def create_post(self, filename, data):
        with self.repository.open(filename, 'w+') as fp:
            post = frontmatter.load(fp)
            if 'metadata' in data:
                post.metadata = data['metadata']
            if 'content' in data:
                #TODO: parse from media
                post.content = data['content']
            frontmatter.dump(post, fp)
            return filename

    def edit_post(self, filename, data):
        # Replace post's data in file
        with self.repository.open(filename, 'r+') as fp:
            post = frontmatter.load(fp)
            if 'metadata' in data:
                post.metadata = data['metadata']
            if 'content' in data:
                post.content = data['content']
            fp.seek(0)
            fp.truncate()
            frontmatter.dump(post, fp)
            return filename

    def remove_post(self, filename):
        self.repository.remove(filename)

    def save_media(self, media):
        config = self.get_config()
        created = []
        for key, medio in media.items():
            if not '/' in key:
                filename = self.repository.path(config['media'] + '/' + key)
            else:
                filename = self.repository.path(key)
            with open(filename, 'wb+') as fm:
                fm.write(b64decode(medio['data']))
                created.append(filename)
        return created

    def get_base_url(self):
        with self.repository.open('_config.yaml', 'r') as fp:
            config = yaml.load(fp)
        return config['baseurl']
