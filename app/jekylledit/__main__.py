from shutil import copytree

from flask.ext.migrate import MigrateCommand
from flask.ext.script import Manager, Server, Shell

from jekylledit import app, db, model


manager = Manager(app)
manager.add_command('db', MigrateCommand)
manager.add_command('runserver', Server(host='0.0.0.0', port=8000))
manager.add_command('shell', Shell())


@manager.shell
def shell_context():
    return {
        'app': app,
        'db': db,
        'model': model,
    }


@manager.command
def export_static(target):
    """Export the static directory."""
    copytree(app.static_folder, target)


def main():
    manager.run()


if __name__ == '__main__':
    main()
