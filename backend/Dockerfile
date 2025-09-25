FROM python:3.13-alpine3.21
LABEL maintainer="andrew.creekmore@me.com"

ENV PYTHONUNBUFFERED=1
ENV PATH="/py/bin:$PATH"

ARG DEV=false
ARG USERNAME=django-user
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create a virtual environment, install system-level dependencies, and add a non-root user.
# This layer is cached and only re-run if the base image or this RUN command changes.
RUN python -m venv /py && \
    apk add --update --no-cache postgresql-client postgresql-dev shadow curl su-exec nodejs npm git bash && \
    groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME

WORKDIR /backend

# Copy requirements files before other source files to leverage caching.
COPY ./requirements ./requirements

# Install Python dependencies into the virtual environment.
# This layer is cached and only re-run if the requirements files change.
RUN apk add --update --no-cache --virtual .tmp-build-deps \
        build-base musl-dev python3-dev gcc libc-dev linux-headers && \
    /py/bin/pip install --upgrade pip && \
    /py/bin/pip install -r ./requirements/req.txt && \
    if [ $DEV = "true" ]; then \
        /py/bin/pip install -r ./requirements/req.dev.txt; \
    fi && \
    if [ $DEV = "true" ]; then \
        npm install -g pyright@latest; \
    fi && \
    apk del .tmp-build-deps && \
    rm -rf ./requirements

# Copy the rest of the application code.
# This is one of the last steps, so changes to code don't invalidate the dependency cache.
COPY . .

# Ensure the non-root user owns the application files.
RUN chown -R $USERNAME:$USERNAME /backend

# Switch to the non-root user for security.
USER $USERNAME

EXPOSE 8000