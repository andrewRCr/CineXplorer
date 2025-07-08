FROM python:3.13-alpine3.21
LABEL maintainer="andrew.creekmore@me.com"

ENV PYTHONUNBUFFERED=1

COPY ./requirements/req.txt /tmp/req.txt
COPY ./requirements/req.dev.txt /tmp/req.dev.txt
# copy the current directory contents into the container
COPY . .

WORKDIR /backend
EXPOSE 8000

ARG DEV=false
ARG USERNAME=django-user
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN python -m venv /py && \
    # install dependencies
    /py/bin/pip install --upgrade pip && \
    apk add --update --no-cache postgresql-client postgresql-dev shadow && \
    apk add --update --no-cache --virtual .tmp-build-deps \
        build-base musl-dev python3-dev gcc libc-dev linux-headers && \
    /py/bin/pip install -r /tmp/req.txt && \
    # install dev dependencies
    if [ $DEV = "true" ]; then \
        /py/bin/pip install -r /tmp/req.dev.txt; \
    fi && \
    # clean up
    rm -rf /tmp && \
    apk del .tmp-build-deps && \
    # add non-root user
    groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME

ENV PATH="/py/bin:$PATH"

# make non-root user default
USER $USERNAME