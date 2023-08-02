---
outline: deep
---

# What is Custom Network Data?

## Overview

**Custom Network Data** is made possible by overriding the data that is sent between the client and the server to inject (or remove) custom data. This can be achieved through the [CharacterMovementComponent](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent)'s **NetworkMoveData** system. 

There are two different types of network data that you can override: 

1. **[CharacterNetworkMoveData](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterNetworkMoveDataContain-/) (NetworkMoveData)**
2. **[CharacterMoveResponseData](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterMoveResponseDataContai-/) (MoveResponseData)**.

## NetworkMoveData

**NetworkMoveData** is sent from the client to the server every single frame, and it contains the **input state**, **output state**, and **TimeStamp** of the performed move. 

When the server receives this data, it will perform the move with the given input state, and check if its computed output state matches the client's output state. If the client's output state is too different form the server's computed output state, then the server sends a **net correction** to the client. 

## MoveResponseData                    

**MoveResponseData** is sent from the server to the client, and is in one to one correspondence with each received move. This mean that for every **NetworkModeData** sent by the client, the server will send back a corresponding MoveResponse. 

Depending on whether the server is sending a **net correction** or not, this MoveResponse can be one of two things:

1. If the server agrees with the client's **output state** for the given move, it will simply **acknowledge** the move and the MoveResponse will only contain a few bits (mainly just a positive bool called **bAckGoodMove**). 

2. If a **desync** is detected, the server will send a MoveResponse with all the **intermediate state** and **output state** bits. When the client receives the MoveResponse data, it adjusts to the server's values and **re-simulates** the **pending moves**.