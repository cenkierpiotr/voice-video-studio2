"""Video generation drivers — Playwright + local."""
from .base import VideoServiceDriver, SegmentResult
from .pixverse import PixverseDriver
from .hailuo import HailuoDriver
from .gemini_web import GeminiWebDriver
from .kling import KlingDriver
from .runway import RunwayDriver
from .local_ffmpeg import LocalFfmpegDriver

_REGISTRY: dict[str, VideoServiceDriver] = {}

_BUILDERS = {
    "pixverse":     PixverseDriver,
    "hailuo":       HailuoDriver,
    "gemini":       GeminiWebDriver,
    "kling":        KlingDriver,
    "runway":       RunwayDriver,
    "local_ffmpeg": LocalFfmpegDriver,
}

def get_driver(service: str) -> VideoServiceDriver:
    if service not in _REGISTRY:
        if service not in _BUILDERS:
            raise ValueError(
                f"Unknown service: {service!r}. Available: {list(_BUILDERS)}"
            )
        _REGISTRY[service] = _BUILDERS[service]()
    return _REGISTRY[service]

__all__ = [
    "VideoServiceDriver", "SegmentResult",
    "PixverseDriver", "HailuoDriver", "GeminiWebDriver",
    "KlingDriver", "RunwayDriver", "LocalFfmpegDriver",
    "get_driver",
]
