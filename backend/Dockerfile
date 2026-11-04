FROM python:3.13-alpine3.24@sha256:7984cf56ceaddebe4fefeb75d64000b9f45d8b77b11a09b24524da6cdc3af0c8 AS base
LABEL maintainer="andrew.creekmore@me.com"

ENV PYTHONUNBUFFERED=1
ENV PATH="/py/bin:$PATH"

FROM base AS dev
ARG USERNAME=django-user
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create a virtual environment, install system-level dependencies, and add a non-root user.
# binutils lets pure-Python psycopg discover libpq after temporary compilers are removed.
# This layer is cached and only re-run if the base image or this RUN command changes.
RUN python -m venv /py && \
    apk add --update --no-cache postgresql-client postgresql-dev shadow curl su-exec git bash binutils && \
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
    /py/bin/pip install -r ./requirements/req.dev.txt && \
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

FROM base AS build
RUN apk add --no-cache build-base libpq-dev && \
    python -m venv /py
WORKDIR /build
COPY ./requirements ./requirements
RUN /py/bin/pip install --no-cache-dir -r ./requirements/req.prod.txt

FROM base AS production
RUN apk add --no-cache libpq && \
    addgroup -S django-user && \
    adduser -S -G django-user django-user
WORKDIR /backend
COPY --from=build /py /py
COPY --chown=django-user:django-user . .
ENV ENVIRONMENT=production

# Build the static manifest with throwaway inputs scoped to this command.
RUN DJANGO_SECRET_KEY=build-placeholder-secret-key-only-for-static-assets-not-for-runtime \
    TMDB_API_KEY=build-placeholder \
    BACKEND_URL=https://build.invalid \
    POSTGRES_DB=build-placeholder \
    POSTGRES_USER=build-placeholder \
    POSTGRES_PASSWORD=build-placeholder \
    DJANGO_ALLOWED_HOSTS=build.invalid \
    python manage.py collectstatic --noinput

USER django-user
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application"]
