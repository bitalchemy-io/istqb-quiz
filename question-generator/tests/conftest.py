import importlib.util
import pathlib

import pytest

MODULE_PATH = pathlib.Path(__file__).resolve().parent.parent / "fragen_generator.py"


@pytest.fixture
def fragen_generator():
    spec = importlib.util.spec_from_file_location("fragen_generator", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
