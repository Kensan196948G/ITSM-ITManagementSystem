#!/usr/bin/env python3
"""
ITSM-ITManagementSystem Setup Configuration
"""

from setuptools import setup, find_packages

setup(
    name="itsm-management-system",
    version="1.0.0",
    description="IT Service Management System with comprehensive automation",
    long_description=(
        open("README.md").read()
        if open("README.md", "r").readable()
        else "ITSM Management System"
    ),
    long_description_content_type="text/markdown",
    author="ITSM Development Team",
    author_email="dev@itsm.local",
    url="https://github.com/Kensan196948G/ITSM-ITManagementSystem",
    packages=find_packages(where="backend", include=["app*"]),
    package_dir={"": "backend"},
    python_requires=">=3.11",
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "sqlalchemy>=2.0.0",
        "alembic>=1.13.0",
        "psycopg2-binary>=2.9.0",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-multipart>=0.0.6",
        "email-validator>=2.1.0",
        "pydantic>=2.5.0",
        "redis>=5.0.0",
        "celery>=5.3.0",
        "pytest>=7.4.0",
        "pytest-asyncio>=0.21.0",
        "pytest-cov>=4.1.0",
        "httpx>=0.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "pytest-html>=4.1.0",
            "pytest-json-report>=1.5.0",
            "pytest-benchmark>=4.0.0",
            "pytest-xdist>=3.3.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.7.0",
            "bandit>=1.7.0",
            "safety>=2.3.0",
        ],
        "test": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "pytest-html>=4.1.0",
            "pytest-json-report>=1.5.0",
            "pytest-benchmark>=4.0.0",
            "pytest-xdist>=3.3.0",
            "httpx>=0.25.0",
            "faker>=20.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "itsm-server=app.main:app",
            "itsm-cli=app.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: System Administrators",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Systems Administration",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
    ],
    keywords="itsm, it-service-management, fastapi, automation, incident-management",
    include_package_data=True,
    zip_safe=False,
)
