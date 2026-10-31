# Optional offline Wardrobe experiment

This is an alternative engine experiment, not an export of ChatGPT's hosted image model and not a verified product integration.

Observed hardware: Apple M5 MacBook Pro, 16 GB unified memory. No Draw Things/ComfyUI installation was found in the initial application search. A candidate model's real peak memory and generation time must be measured before promising usability.

First candidate: Draw Things, from the official App Store/vendor. It supports local creation on Apple devices, image-to-image workflows, imported models/LoRAs and optional cloud compute. Use Local Only; download model files before disconnecting. A local scripting/HTTP interface exists in the vendor source and can support a future adapter. Do not enable network-wide access for a single-machine test.

Acceptance test: one face-conditioned, garment-conditioned outfit from actual local Wardrobe files, with network disconnected after setup; record engine/model/version/license, all reference inputs, peak memory, elapsed time and complete output dimensions. Owner must approve likeness and exact clothing. No public-release or all-21-outfit claim before this passes.

Possible subsequent architecture: local Wardrobe interface -> authenticated loopback helper -> local engine -> output validation -> saved lookbook. A phone can later control the Mac on a trusted local network; this is not generation running entirely on the phone. The current GitHub Pages app cannot simply be assumed to have unrestricted local HTTP access; native packaging, origin restrictions, authentication and local-network/browser behavior require separate engineering.

Downloading and running a different model avoids metered model APIs for generation, but does not establish matching ChatGPT quality. Model licenses and redistribution rights must be checked for any public app. Offline generation does not automatically provide offline conversational trip planning.

Sources checked October 31, 2026:
- https://apps.apple.com/us/app/draw-things-offline-ai-art/id6444050820?platform=mac
- https://github.com/drawthingsai/draw-things-community/blob/main/Libraries/HTTPAPIServer/Sources/HTTPAPIServer.swift
- https://huggingface.co/Qwen/Qwen-Image-Edit-2511 (a separately downloadable multi-image editing model; not yet selected or tested on this Mac)
