FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TTS_AGREE_TO_USER_AGREEMENT=1
ENV COQUI_TOS_AGREED=1
ENV NVIDIA_VISIBLE_DEVICES=all

RUN apt-get update && apt-get install -y \
    python3.12 python3.12-dev python3-pip python3.12-venv \
    ffmpeg libsndfile1 git curl \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3.12 /usr/local/bin/python3

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p audio-output xtts-speakers ai-models

EXPOSE 47821

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:47821/api/ai/status || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "47821"]
