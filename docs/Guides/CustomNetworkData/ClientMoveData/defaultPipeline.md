---
outline: deep
---


# Default CharacterMovementComponent Pipeline

## Overview

Before adding our **custom** data, we need to **learn** a few things about how the default [**CharacterMovementComponent**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent) works. 

During the **client** CharacterMovementComponent's **TickComponent**, the function [**ReplicateMoveToServer**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent/ReplicateMoveToS-) is called. This function does these three things in order:

1. Creates and sets a new [**SavedMove**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FSavedMove_Character/).
2. Performs the move using the function, [**PerformMovement**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent/PerformMovement/).
3. Calls the function, [**CallServerMovePacked**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent/CallServerMovePacked/).


However, this last step is not that simple. If you have watched [**Delgoodie's CMC tutorials**](https://www.youtube.com/watch?v=urkLwpnAjO0&list=PLXJlkahwiwPmeABEhjwIALvxRSZkzoQpk), you would remember that when you added custom variables to the [**SavedMove**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FSavedMove_Character/) struct, you also had to update the [**CanCombineWith**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FSavedMove_Character/CanCombineWith/) function.

This function checks to see if it can **combine** the current NewMove with the last SavedMove (reffered to as the **PendingMove**). This is because the client doesn't actualy run CallServerMovePacked **every** frame, but it actually runs it every **other** frame. In the first frame, it actually just **saves** the SavedMove as the PendingMove, and then in the **next** frame it checks to see if it can **combine** the PendingMove with the NewMove. If it can, then it just sends one SavedMove for **both** frames, instead of sending two, which **improves** bandwidth usage.

::: info NOTE
You hsould only combine moves if they have basically all the same input state data. 
:::

A good example of this happening is if the player was just running in a **straight** line. If the **acceleration** in both frames is pretty much the same, and the **velocity** also doesn't change much, then it can **combine** the moves and send them as one combined move to the server. The combined move uses the **output** state of the most **recent** SavedMove, but it **adds** the deltaTimes of both moves, so that it is effectively one big move.

However, if the client was **wrong**, and the moves were **different** (say the player pressed jump in the newest SavedMove, but wasn't in the PendingMove), then it needs to send **both** moves, **seperately**, but in the same frame. 

You can see how this system works really well, as in **most** 60fps games, the player is **usually** holding down the same keys for a **majority** of the frames, and only **changes** the button states every few seconds. 

But, there is actually one more move that the client will send to the server, called the **OldMove**. The OldMove is the oldest **unacknowledged** important SavedMove. Remember how the server sends back an **acknowledgement** for every move? Sometimes moves get **dropped**, arrive late, or sometimes responses from the server get dropped. To try and combat this, the client will send the **oldest** move that hasn't been acknowledged by the server, assuming that it was probably dropped out the **first time** it was sent.

So in total, in any given frame there can be up to **three** different moves being sent; The **NewMove**, **PendingMove**, and the **OldMove**. But there could also be **no moves** being sent, if there aren't any **unacknowledged** SavedMoves, and we are holding off on sending the move by putting it in the PendingMove for the **next** frame.

## Inside CallServerMovePacked

After learning all that, we can **finally** start looking inside the function, and exploring what **actually happens** in [**CallServerMovePacked**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent/CallServerMovePacked/).

Firstly, we can see that the **function** takes in 3 variables: **NewMove**, **PendingMove**, and **OldMove**, which we just learnt about in the previous section.

```cpp
virtual void CallServerMovePacked(
    const FSavedMove_Character* NewMove,
    const FSavedMove_Character* PendingMove,
    const FSavedMove_Character* OldMove
);
```

::: tip 
It is **greatly encouraged** for everyone to go ahead and **read** through this function in the source code **themselves**, as it is only 49 lines long, and can help with **understanding** it better.
:::

### Filling the MoveContainer

Now, inside of the function we first get a **reference** to something called a [**FCharacterNetworkMoveDataContainer**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterNetworkMoveDataContain-/), and use the its [**ClientFillNetworkMoveData**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterNetworkMoveDataContain-/ClientFillNetwor-/) method to fill it with the client data, which contains all 3 moves previously talked about.

```cpp
// Get storage container we'll be using and fill it with movement data
FCharacterNetworkMoveDataContainer& MoveDataContainer = GetNetworkMoveDataContainer();
MoveDataContainer.ClientFillNetworkMoveData(NewMove, PendingMove, OldMove);
```
This **FCharacterNetworkDataContainer**, or **MoveDataContainer** for short, is a **struct** which contains three network moves. These **network** moves are not SavedMoves, but another struct called [**FCharacterNetworkMoveData**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterNetworkMoveData/), or **NetworkMove** for short. In **ClientFillNetworkMoveData**, we pass along the SavedMoves to the three NetworkMoves to fill them with data, these are then the actual network move structs which are put into the **MoveDataContainer**.

This can be seen here, where the NewMoveData is a NetworkMove variable. 


```cpp
NewMoveData->ClientFillNetworkMoveData(*ClientNewMove, FCharacterNetworkMoveData::ENetworkMoveType::NewMove);
bDisableCombinedScopedMove |= ClientNewMove->bForceNoCombine;
```

::: details 
This is also **repeated** for the **PendingMoveData**, and the **OldMoveData**. You can see this on the **highlighted** lines of the function:

```cpp{7-8,14,16,26}
void FCharacterNetworkMoveDataContainer::ClientFillNetworkMoveData(const FSavedMove_Character* ClientNewMove, const FSavedMove_Character* ClientPendingMove, const FSavedMove_Character* ClientOldMove)
{
	bDisableCombinedScopedMove = false;

	if (ensure(ClientNewMove))
	{
		NewMoveData->ClientFillNetworkMoveData(*ClientNewMove, FCharacterNetworkMoveData::ENetworkMoveType::NewMove);
		bDisableCombinedScopedMove |= ClientNewMove->bForceNoCombine;
	}

	bHasPendingMove = (ClientPendingMove != nullptr);
	if (bHasPendingMove)
	{
		PendingMoveData->ClientFillNetworkMoveData(*ClientPendingMove, FCharacterNetworkMoveData::ENetworkMoveType::PendingMove);
		bIsDualHybridRootMotionMove = (ClientPendingMove->RootMotionMontage == nullptr) && (ClientNewMove && ClientNewMove->RootMotionMontage != nullptr);
		bDisableCombinedScopedMove |= ClientPendingMove->bForceNoCombine; 
	}
	else
	{
		bIsDualHybridRootMotionMove = false;
	}
	
	bHasOldMove = (ClientOldMove != nullptr);
	if (bHasOldMove)
	{
		OldMoveData->ClientFillNetworkMoveData(*ClientOldMove, FCharacterNetworkMoveData::ENetworkMoveType::OldMove); 
	}
}
```
:::

::: info NOTE
It might look a little bit confusing, but the **ClientFillNetworkMoveData** method being called on the **NewMoveData** is not the same function as the **ClientFillNetworkMoveData** being called on the **MoveDataContainer**. 
:::

Then, in the **NetworkMove**'s **ClientFillNetworkData** method, we only take the **neccessary** data from the SavedMove, and use it to **fill** the NetworkMove

```cpp
NetworkMoveType = MoveType;
TimeStamp = ClientMove.TimeStamp;
ControlRotation = ClientMove.SavedControlRotation;
CompressedMoveFlags = ClientMove.GetCompressedFlags();
MovementMode = ClientMove.EndPackedMovementMode;
```

Just as a quick **summary**, lets go over what we have just looked at. First, we call **ClientFillNetworkMoveData** on the **MoveDataContainer**, and pass in our **NewMove**, **PendingMove**, and **OldMove**. Then, it calls **ClientFillNetworkData** (different from the one we called on the MoveDataContainer) on each of the moves we passed in, and stores only the **necessary** data in the new **NetworkMove** variables; **NewMoveData**, **PendingMoveData**, and **OldMoveData**.
Then those **NetworkMove** variables are passed into the **MoveDataContainer**.

### Serialising the moves

Up until now we've just been **passing** around the data, but now we finally have to **serialize** it. If you aren't familiar with serializing, it just means **converting** all the data to raw **bits**. This **serialization** is done for two reasons:

1. Serializing our **NetworkMove** means we can **optimize** it and only send as **few** bits as possible.
2. We can serialize a **variable** number of bits, meaning you can add more bits for your **custom data**.

::: info NOTE
This was **not** **possible** until recent versions of Unreal Engine (just before Unreal Engine 5 released).
:::

Now that we have a full **MoveContainer**, we can begin **serializing** the data. This is simply done by using the **MoveDataContainer**'s **Serialize** method

```cpp
MoveDataContainer.Serialize(*this, ServerMoveBitWriter, ServerMoveBitWriter.PackageMap)
```