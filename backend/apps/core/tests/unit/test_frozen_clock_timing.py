"""Frozen application time must not change pytest's elapsed-time clock."""

from datetime import UTC, datetime, timedelta
from time import perf_counter

from _pytest.timing import Duration, Instant
from freezegun import freeze_time


def test_pytest_durations_use_real_time_across_nested_freezes() -> None:
    # A local reference keeps the observation clock outside Freezegun's module patches.
    real_counter = perf_counter
    real_start = real_counter()
    started = Instant()
    instants = [started]
    durations: list[Duration] = []

    with freeze_time("2026-11-10 12:00:00") as clock:
        instants.append(Instant())
        durations.append(started.elapsed())
        assert datetime.now(UTC) == datetime(2026, 11, 10, 12, tzinfo=UTC)
        clock.tick(delta=timedelta(hours=2))
        instants.append(Instant())
        assert datetime.now(UTC) == datetime(2026, 11, 10, 14, tzinfo=UTC)

        with freeze_time("2026-11-11 23:59:59.500000") as nested:
            instants.append(Instant())
            nested.tick(delta=timedelta(seconds=0.5))
            instants.append(Instant())
            assert datetime.now(UTC) == datetime(2026, 11, 12, tzinfo=UTC)
            durations.append(started.elapsed())

        instants.append(Instant())
        assert datetime.now(UTC) == datetime(2026, 11, 10, 14, tzinfo=UTC)
        durations.append(instants[1].elapsed())

    instants.append(Instant())
    durations.append(instants[1].elapsed())
    real_stop = real_counter()

    for instant in instants:
        assert real_start <= instant.perf_count <= real_stop
    for duration in durations:
        assert 0 <= duration.seconds <= real_stop - real_start
