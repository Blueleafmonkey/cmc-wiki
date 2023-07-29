# FSavedMove_Character

FSavedMove_Character represents a saved move on the client that has been sent to the server and might need to be played back.

### Variables

::: details CharacterOwner
```cpp
ACharacter* CharacterOwner;
```

Stores a pointer to the current owner of this character.
:::

::: details bPressedJump
```cpp
uint32 bPressedJump:1;
```

Boolean value. True when player activates jump input.
:::

::: details bWantsToCrouch
```cpp
uint32 bWantsToCrouch:1;
```

Boolean value. True when player activates crouch input.
:::

::: details bForceMaxAccel
```cpp
uint32 bForceMaxAccel:1;
```

If true, ignores size of acceleration component, and forces max acceleration to drive character at full velocity.
:::

::: details bForceNoCombine
```cpp
uint32 bForceNoCombine:1;
```

If true, can't combine this move with another move.
:::

::: details bOldTimeStampBeforeReset
```cpp
uint32 bOldTimeStampBeforeReset:1;
```

If true this move is using an old TimeStamp, before a reset occurred.
:::

::: details bWasJumping
```cpp
uint32 bWasJumping:1;
```

Used to determine if the character was jumping.
:::
