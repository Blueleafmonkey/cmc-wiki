# Networked Booleans in Unreal Engine

This page will discuss how Unreal Engine handles networked booleans in its Character Movement Component

## Booleans inside FSavedMove_Character class

Inside of the FSavedMove_Character class (located inside CharacterMovementComponent.h) we see that they used
```cpp
uint32 variable;
```
instead of
```cpp
bool variable;
```

This is shown with these variables:

```cpp
uint32 bPressedJump:1;
uint32 bWantsToCrouch:1;
uint32 bForceMaxAccel:1;
uint32 bForceNoCombine:1;
uint32 bOldTimeStampBeforeReset:1;
uint32 bWasJumping:1;
```

The reason why they use uint32 for boolean values instead of bool, is because bool variables take up at least 1 Byte each, whereas a uint32 only takes up 4 Bytes each. Now you may think, "aren't they using more bytes then? since each uint32 is 4 bytes, and they are all seperate variables?" Well, this is where bit-fielding comes in. Because each variable only takes up one bit of the 4 bytes that make up a uint32, the variables are automatically compressed into one uint32, meaning that instead of having 6 seperate utin32 or bool variables, it only uses one uint32. Comparing this to using bools, instead of all those variables taking up 6 bytes, they only take up 4 bytes all together, which is pretty neat if you're sending this information over a network.