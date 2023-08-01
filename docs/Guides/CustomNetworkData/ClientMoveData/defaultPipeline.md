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

### Filling the MoveDataContainer

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

Now that we have a full **MoveDataContainer**, we can begin **serializing** the data. This is simply done by using the **MoveDataContainer**'s [**Serialize**](https://docs.unrealengine.com/5.2/en-US/API/Runtime/Engine/GameFramework/FCharacterNetworkMoveDataContain-/Serialize/) method.

```cpp
MoveDataContainer.Serialize(*this, ServerMoveBitWriter, ServerMoveBitWriter.PackageMap)
```

Inside of the **MoveDataContainer**'s **Serialize** method, we can see that all it really does is just call the **Serialize** methods on our three **NetworkMoves**. 

```cpp
if (!NewMoveData->Serialize(CharacterMovement, Ar, PackageMap, FCharacterNetworkMoveData::ENetworkMoveType::NewMove))
{
	return false;
}
```

::: details
This is also repeated for the **PendingMoveData** and **OldMoveData**, as seen on the **higlighted** lines.

```cpp{7,17,27}
bool FCharacterNetworkMoveDataContainer::Serialize(UCharacterMovementComponent& CharacterMovement, FArchive& Ar, UPackageMap* PackageMap)
{
	// We must have data storage initialized. If not, then the storage container wasn't properly initialized.
	check(NewMoveData && PendingMoveData && OldMoveData);

	// Base move always serialized.
	if (!NewMoveData->Serialize(CharacterMovement, Ar, PackageMap, FCharacterNetworkMoveData::ENetworkMoveType::NewMove))
	{
		return false;
	}
		
	// Optional pending dual move
	Ar.SerializeBits(&bHasPendingMove, 1);
	if (bHasPendingMove)
	{
		Ar.SerializeBits(&bIsDualHybridRootMotionMove, 1);
		if (!PendingMoveData->Serialize(CharacterMovement, Ar, PackageMap, FCharacterNetworkMoveData::ENetworkMoveType::PendingMove))
		{
			return false;
		}
	}

	// Optional old move
	Ar.SerializeBits(&bHasOldMove, 1);
	if (bHasOldMove)
	{
		if (!OldMoveData->Serialize(CharacterMovement, Ar, PackageMap, FCharacterNetworkMoveData::ENetworkMoveType::OldMove))
		{
			return false;
		}
	}

	Ar.SerializeBits(&bDisableCombinedScopedMove, 1);

	return !Ar.IsError();
}
```
:::

But how do we **actually** serialize? With an **archive**. An archive is a **bitstream** that allows you to “push” bits **onto** or **off of** it. If you haven’t seen a bitstream, don’t worry since you don’t really need to know how it **works**, just how to **use** it. In our case, the archive is **ServerMoveBitWriter**. So let’s see what happens when we call **Serialize** on our **NetworkMoves**.

```cpp
bool FCharacterNetworkMoveData::Serialize(UCharacterMovementComponent& CharacterMovement, FArchive& Ar, UPackageMap* PackageMap, FCharacterNetworkMoveData::ENetworkMoveType MoveType)
{
	NetworkMoveType = MoveType;

	bool bLocalSuccess = true;
	const bool bIsSaving = Ar.IsSaving();

	Ar << TimeStamp;

	// TODO: better packing with single bit per component indicating zero/non-zero
	Acceleration.NetSerialize(Ar, PackageMap, bLocalSuccess);

	Location.NetSerialize(Ar, PackageMap, bLocalSuccess);

	// ControlRotation : FRotator handles each component zero/non-zero test; it uses a single signal bit for zero/non-zero, and uses 16 bits per component if non-zero.
	ControlRotation.NetSerialize(Ar, PackageMap, bLocalSuccess);

	SerializeOptionalValue<uint8>(bIsSaving, Ar, CompressedMoveFlags, 0);

		SerializeOptionalValue<UPrimitiveComponent*>(bIsSaving, Ar, MovementBase, nullptr);
		SerializeOptionalValue<FName>(bIsSaving, Ar, MovementBaseBoneName, NAME_None);
		SerializeOptionalValue<uint8>(bIsSaving, Ar, MovementMode, MOVE_Walking);

	return !Ar.IsError();
}
```

In just these few lines, you can see **all** of the **data** being sent from the **client** to the **server**. Pay **careful** attention to this, since this is where we will actually **control** what data is being sent to the **server**. The **Ar** variable in the code is an **FArchive** object, and we can **add** data to it in **several** ways. A few of these ways are showcased in this function. At the top, we can see the **TimeStamp** of the moves being pushed onto the **Ar** archive with the **bitwise** << **operator**. This essentially just **copies** the entire 4 byte float onto the archive. 

Then, we can see the **NetSerialise** method being used on the **Acceleration**, **Location** and **ControlRotation** variables. This method pretty much does the same thing under the hood, by just adding the data onto the archive.

::: info NOTE
The **Location** variable is a **FVector_NetQuantized1000**, the **Acceleration** variable is a **FVector_NetQuantized10**, and the **ControlRotation** is just an **FRotator**.
:::

We can also see another method, **SerializeOptionalValue**, which allows us to **optionally** serialize a value based on a **bool**.

But there is one more **super** helpful method that we can use, called **SerializeBits**. This method allows us to pass in a **variable**, but also chose how long or how many **bits** of that variable we actually want to **serialize**. This is super useful if you want to **serialize** a variable, but you aren't actually using **all** the bits in the variable type. **Every bit counts**.

### Sending it to the server

Now that we've filled all three **NetworkMoves** and **serialized** them onto the **FArchive**, we can **finally** go on to the last step, which is **sending** all the data to the **server**.

At the end of **CallServerMovePacked**, we can see it do just that, using the **ServerMovePacked_ClientSend** method.

```cpp
// Send bits to server!
ServerMovePacked_ClientSend(PackedBits);
```

This method is a **wrapper** function for the RPC on the **Character** class, which once **executed** on the server, calls **ServerMovePacked_ServerReceive** back in the **CharacterMovementComponent**.

```cpp
CharacterOwner->ServerMovePacked(PackedBits);
```

::: tip 
If you're wondering why we go from **CharacterMovementComponent** -> **Character** -> **Over Network** -> **Character** -> **CharacterMovementComponent**, this is because the **CharacterMovementComponent** is actually **not replicated** by default. All **CharacterMovementComponent** related replicated **variables** and **RPCs** are actually on the **Character**. This is because **replicating** a component adds **additional** network **overhead**, so Unreal Engine is saving you a bit of **bandwidth** by doing this.
:::

## Inside ServerMovePacked_ServerReceive

Now the server has just received a client move. The server has a **valid** **MoveDataContainer** variable, but is is currently **empty**, so the **first** thing we do inside **ServerMovePacked_ServerReceive** is **fill** it using the **GetNetworkMoveDataContainer** method.

```cpp
FCharacterNetworkMoveDataContainer& MoveDataContainer = GetNetworkMoveDataContainer();
```

### Deserializing on the server

Now we have our **full** **MoveContainer**, but all the data is still **serialized** in **bits**, so we need to **deserialize** these bits into **data**. To do this we call the Container’s **Serialize** function.

```cpp
MoveDataContainer.Serialize(*this, ServerMoveBitReader, ServerMoveBitReader.PackageMap)
```

Okay you might be **confused** at first. Didn’t we use this to **serialize** data into bits, but now we are trying to **deserialize** bits into data? 

Well, the **FArchive** does a little **trick** where it actually has a **“direction”**. If it is **saving**, it will write variables into bits, but if it is **loading**, it will write the bits into the variables. Basically, all you need to know is that you don’t need to write a different deserialization function, since the archive will **automatically** populate your custom **MoveDataContainer** and its custom **NetworkMoveData** objects. This is really **helpful** because it eliminates the **possibility** of you **misinterpreting** bits which would be really annoying to debug.

### Performing moves on the server

Now that we **finally** have a **MoveDataContainer** on the server **filled** with the three moves from the **client**, we can call **ServerMove_HandleMoveData**. 

```cpp
ServerMove_HandleMoveData(MoveDataContainer);
```

This method is mainly just a **wrapper** function which calls **ServerMove_PerformMovement** for the NewMove, PendingMove, and OldMove.

```cpp
ServerMove_PerformMovement(*NewMove);
```

Inside of **ServerMove_PerformMovement**, we call **MoveAutonomous**, which **performs** the move. Then we call **ServerMoveHandleClientError**, which calls **ServerCheckClientError** to see if the values that the client sent are the **same** as the resultant values after the server performs the moves in **MoveAutonomous**. If everything **matches** up, the server **acknowledges** the move. However, if there is a **desync**, then the server queues up a **PendingAdjustment**.

## End and Recap

We have **finally** reached the **end** of the **default Client Move Data pipeline**. Lets quickly **recap**, so we don't forget what we just learned. 

We started on the **client**, which **performed** the moves on the **TickComponent**, and **recorded** the **state values** in the **SavedMove**. Then it checked how many **moves** to send to the **server**, filled those **SavedMoves** into the **NetworkMoveData** objects inside the **MoveDataContainer**, **serialized** all the **data**, and **sent** it to the **server**. 

Once sent to the **server**, we **deserialized** the bits into **NetworkMoveData** objects, then called **ServerMove_PerforMovement** for each of the received moves. This **performed** the moves on the **server**, and then **checked** if the **client's output** matched the **server's output**, finally **acknowledging** the move or **issuing** a **correction** if the client was **out of sync**.


