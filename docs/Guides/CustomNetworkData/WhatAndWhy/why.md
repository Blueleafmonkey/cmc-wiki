---
outline: deep
---


# Why use Custom Network Data

## Overview

There are four main reasons why you might need to use custom network data:

1. Custom input state data.
2. Custom output state data.
3. Removing unused state data.
4. Frame zero desync corrections.

## Custom Input State Data

Currently the default [**CharacterMovementComponent**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent) sends an extremely **minimal** input state, and you only really get to customize a few CompressedFlags. This leads to circumstances where you need more **custom data**, but are unable to do so with the **default options**. Maybe you need more CompressedFlags, maybe you need to send extra inputs for things such as joysticks. By using **custom** network data, you are able to expand on the **defaults** and add space for your own data to be sent.

::: warning 
If you think you need to send **a lot of data** (such as vectors or transforms) in the input state, you are probably thinking about it **wrong**. If you want to send data for a one-off event like starting a slide, where you need to include floats, vectors, do it in a **reliable RPC**.
:::

## Custom Output State Data

As previously mentioned, the default **client** will send its input state to the **server**, but it will also send its own minimal **output** state of the move. Currently, the client just sends the output location and movement mode, but sometimes this may not be enough. If you had a custom value that was **critical** to performing moves, you might also want to send it as well. 

The **goal** is that the server can use the client's output state as an additional way to detect if the client is **out of sync**, and issue a **net correction** faster. If the server issues the net correction quick enough, the client will be **smoothly** corrected, meaning the player might not even **notice** the correction. 

::: info NOTE
The actual difference between the intermediate state and the output state is a bit arbitrary. You can promote the intermediate state to the output state if you think it's important enough. The main difference is that the output state is what gets send from the client every frame, whereas the intermediate state is not.
:::

## Removing Unused State Data

From more of an **optimization** standpoint, if you look into the **MoveData** being sent, you may notice that some values being sent aren't actually being used in your game. By not sending those values, you can save a little bit of extra **bandwidth**, or use that bandwidth for more **critical** values. 

A few **common** values that you might not be using are:

1. MovementBase information.
2. ControlRotation roll (most games only use pitch and yaw).
3. Certain CompressedFlags, such as crouch or **engine reserved** flags.

## Frame Zero Desync Corrections

The previously mentioned reasons all targeted sending custom data from the **client** to the **server**, but its also **important** to consider overriding the data being sent from the **server** to the **client**. Frame zero desync correction means that no matter what kind of desync happens, when the client receives an update from the server, it will recover back to the server's state in one [**ClientAdjustment**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FClientAdjustment) call. However, if you have added **any** intermediate or output state values, then you will need to send **custom MoveResponse** data to achieve frame zero desync correction. 

**To see why, imagine this example:**

You've added an **enum** indicating the walk type (slow, normal, sprint) to the **intermediate** state values. If the client gets a **desync**, and this state is not in sync with the server, we will get a correction from the server containing info with the **correct** MoveData, but not anything about the walk type. Then the client will **re-simulate** these moves, but with the **incorrect** walk type again. This will cause the server to send more **net corrections**, until the client ends up **completely** out of sync.

But by sending all intermediate and output states to the client and achieving frame zero desync correction, even if every state on the client got **horribly** out of sync, it would all be brought back into sync in just **one** net correction!
