import os.path

from contextlib import contextmanager
from subprocess import Popen, PIPE


class Repository:

    def __init__(self, name):
        self.name = name

    def path(self, filename=None):
        directory = os.path.join('/var/www/jekylledit', self.name)
        if filename is None:
            return directory
        return os.path.join(directory, filename)

    def open(self, filename, mode):
        # Python in Docker has ASCII as default encoding.
        return open(self.path(filename), mode, encoding='utf-8')

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
            '-c', 'user.email={}'.format(current_user.email),
        ]
        cmd.extend(args)
        proc = Popen(cmd, stdin=PIPE, stdout=PIPE, stderr=PIPE)
        out, err = proc.communicate()
        if proc.returncode != 0:
            raise Exception(err)
        return out
