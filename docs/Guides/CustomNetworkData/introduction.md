---
outline: deep
---

# Introduction to Custom Network Data

## Overview

This document will cover how to use and send **custom network data** between the **server** and **client** through the [**CharacterMovementComponent**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent). This could include sending additional compressed flags, additional input vectors, and more custom data.

::: warning
You must be using Packed Movement RPCs for this to work! (This is determined by console variable NetUsePackedMovementRPCs)
:::


## Terminology

During this guide, you will see the terms **Input State**, **Intermediate State** and **Output State** a lot. Lets begin by explaining these terms.

### Input State

The input state refers to any value that is used to calculate moves, and these values are purely Client Authoritative.

There are current only three default input states: **Acceleration**, **Control Rotation**, and **CompressedFlags**. These values are driven directly by player inputs, such as key presses or mouse movements. Because these values are Client Authoritative, the server has no ability to change them.

### Intermediate State

The intermediate state refers to any values that are in between input and output, as these values are modified by inputs, but also modify the output state.

A good example of this is **velocity**. Velocity is affected by **acceleration**, but it also modifies **location**.

### Output State

The output state refers to any values that are the end result of performing a move. 

For most projects, this will consist mainly of the **capsule location**, and the **movement mode**. These are the "end values" that affect what the player sees in the world.

::: info NOTE
All types of state values are stored in the SavedMove, but only the input state should be replayed in the PrepMoveFor function.
:::
 
### Other Terminology

You will see the terms **client** and **server** a lot. In this case, client refers specifically to the owning client.

**Net Correction** and **ClientAdjustment** are synonymous (they mean the same thing).

Unreal Engine internally refers to the **network data** as **PacketMovementRPCs**. This may be because the system was originally intended to just use more compressed flags as triggers, instead of RPCs (which is a very good use, but not the only use).
