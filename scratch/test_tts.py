import asyncio
import edge_tts

async def test():
    communicate = edge_tts.Communicate("Dzień dobry, to jest test.", "pl-PL-MarekNeural")
    await communicate.save("test.mp3")
    print("Zapisano test.mp3")

if __name__ == "__main__":
    asyncio.run(test())
