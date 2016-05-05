#!/usr/bin/env python3

import os
import setuptools

name = 'jekylledit'

setuptools.setup(
    name=name,
    version=os.environ['VERSION'],
    packages=setuptools.find_packages(),
    include_package_data=True,
    zip_safe=False,
    entry_points={
        'console_scripts': ['{name}={name}.__main__:main'.format(name=name)]
    })
