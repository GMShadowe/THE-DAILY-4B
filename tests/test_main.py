import argparse
from datetime import datetime

import pytest

import main


def test_waits_until_later_today():
    assert main.seconds_until("06:00", datetime(2026, 10, 29, 5, 30)) == 1800


def test_rolls_over_to_tomorrow():
    assert main.seconds_until("06:00", datetime(2026, 10, 29, 6, 0)) == 86400


@pytest.mark.parametrize("value", ["25:00", "6am", ""])
def test_clock_rejects_bad_times(value):
    with pytest.raises(argparse.ArgumentTypeError):
        main.clock(value)
