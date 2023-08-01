---
outline: deep
---




So that was an overview of how move data is sent from client to server, but how do we add our own custom data to this? We need to override the two structs: FCharacterNetworkMoveDataContainer and FCharacterNetworkMoveData as well as several CMC functions.

When I say “override” a struct, this means creating a new struct that is derived from the default one. First, create a custom NetworkMove struct:

struct FZippyNetworkMoveData : public FCharacterNetworkMoveData 
{
	uint8 MoreCompressedFlags; // your custom data

	FZippyNetworkMoveData() : FCharacterNetworkMoveData(), MoreCompressedFlags(0) {}

	virtual bool Serialize(...) override;
	virtual void ClientFillNetworkMoveData(...) override;
};

Fill it with variables corresponding to the additional data you want to send over the network (like another uint8 MoreCompressedFlags). Also override two methods from this struct: ClientFillNetworkMoveData and Serialize. In the ClientFillNetworkMoveData function, call the Super function (note that the Super keyword is not valid here, you have to call FCharacterNetworkMoveData::ClientFillNetworkMoveData) and then cast the SavedMove to your custom SavedMove class and copy the additional data that you want to send over the network from the custom saved move into the member variables of your new custom NetworkMove struct. In the Serialize method, you actually shouldn’t call the Super function, but go into the source code and copy and paste the default implementation of FCharacterNetworkMoveData::Serialize into your new Serialize function. Then serialize any additional data using the above explained methods, and remove any lines that serialize data you don’t need. This way we only send the minimum number of bits and keep our network usage optimal.

For the MoveContainer, we make FZippyNetworkMoveDataContainer, which is derived from the original struct FCharacterNetworkMoveDataContainer in much the same way as before. This struct is much easier because we actually don’t even need to override any methods, just make a member variable that is an array of three custom NetworkMoveData structs. Then in the constructor, don’t call the Super constructor but set the three base class NetworkMoveData pointer variables to references from your custom NetworkMoveData array. Note here I am making use of an inline constructor. Also, you don’t have to make an array of NetworkMoveDatas, you could make three distinct variables, all that matters is you have three valid references to custom NetworkMoveData objects which will be guaranteed to exist for the lifetime that the container exists.

struct FZippyNetworkMoveDataContainer: public FCharacterNetworkMoveDataContainer
{
	FZippyNetworkMoveData CustomMoves[3];

	FZippyNetworkMoveDataContainer() {
		NewMoveData = &CustomMoves[0];
		PendingMoveData = &CustomMoves[1];
		OldMoveData = &CustomMoves[2];
}
};


So we’ve linked usage of our custom NetworkMoveData struct into our custom MoveContainer, but how do we link the custom MoveContainer to our CMC? First, make a private variable in your custom CMC that holds a custom MoveContainer:

private:
	FZippyNetworkMoveDataContainer ZippyNetworkMoveDataContainer;

and then in the your custom CMC constructor, set the CMC’s NetworkMoveDataContainer to your custom container variable.

	SetNetworkMoveDataContainer(ZippyNetworkMoveDataContainer);

With this in place, we will use our custom MoveContainer to fill and serialize data meaning our custom data will be sent across the network! This is great but just sending extra data to the server doesn’t mean anything if we don’t use it in some way. 

Remember the pipeline on the server is:

Deserialize
ServerMove_HandleMoveData
ServerMove_PerformMovement
MoveAutonomous
ServerMoveHandleClientError
ServerCheckClientError

We already wrote the deserialization function (its just the serialize function), and steps 2 and 3 just handle generic move logic that will probably be the same for all projects. Its MoveAutonomous and ServerCheckClientError that we are interested in overriding, but this is where your intentions with custom movement data come into play.

If you are adding custom output state that you will use to detect more net desyncs, then you want to override ServerCheckClientError. This method returns true if there is an error and false if there isn’t, so simply override this function and add a check with your custom data.

ServerCheckClientError(...)
{
	return Super(...) || ServerCheckCustomDataError();
}

If you are adding custom input state, you need to process this data into your server’s CMC to perform the move correctly. (We’ll use MoreCompressedFlags example) To do this just add a line before the Super implementation to update the CMC values from the received values:


MoveAutonomous(...) 
{
UpdateFromMoreCompressedFlags();	
	Super(...);
}


Notice I defined two vague functions for each use case (ServerCheckCustomDataError and UpdateFromMoreCompressedFlags). So how do you go about correctly reading the custom net data values? The key is that the CMC will automatically store the currently simulating NetworkMoveData in a private member variable called CurrentNetworkMoveData. This is helpful because it allows us to bypass the fact that these functions we override (ServerCheckClientError or MoveAutonomous) have fixed signatures which don’t include any of our custom data. Just simply access the current NetworkMoveData through the public method GetCurrentNetworkMoveData() and then cast it to your custom NetworkMoveData class:


FZippyNetworkMoveData* CustomMoveData = static_cast<FZippyNetworkMoveData*>(GetCurrentNetworkMoveData());

Hopefully this gives you a good understanding of how to move custom networked data from client to server and process that data accordingly to either allow more complex moves or enhance desync detections.
