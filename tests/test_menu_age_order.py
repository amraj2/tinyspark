import re
from app import create_app


def test_home_menu_runs_from_youngest_to_oldest():
    html = create_app().test_client().get('/').text
    ages = [int(age) for age in re.findall(r'data-min-age="(\d+)"', html)]
    assert ages and ages == sorted(ages)
    first = re.search(r'<a class="game-option selected"[^>]+data-title="([^"]+)"[^>]+data-min-age="(\d+)"', html)
    assert first and int(first.group(2)) == min(ages)
