// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract Voting{
    
    modifier onlyChairperson() {
        require(msg.sender == _chairperson, 'You must be the chairperson!');
        _;
    }

    modifier notChairperson() {
        require(msg.sender != _chairperson, 'The chairperson can not vote!');
        _;
    }

    modifier voteNotStarted() {
        require(_voteStarted == false, 'You can modify the voting only before it starts!');
        _;
    }

    modifier voteStarted() {
        require(_voteStarted == true, 'The voting did not start yet!');
        _;
    }

    modifier votingIsValid() {
        for(uint8 i = 0; i < _questionsCount; i++){
            require(_questions[i].proposals.length > 0, 'All questions must have at least a proposal!');
        }
        _;
    }

    modifier voteOnce() {
        require(_voted[msg.sender] == false, 'You must vote only once!');
        _;
    }

    modifier answeredAll(uint proposalsLength) {
        require(proposalsLength == _questionsCount, 'You must answer all the questions!');
        _;
    }

    modifier voteNotEnded() {
        require(_voteEnded == false, 'The voting has ended!');
        _;
    }

    modifier voteEnded() {
        require(_voteEnded == true, 'You can see the results only after the voting ends!');
        _;
    }
    
    address _chairperson;    

    bool _voteStarted;
    bool _voteEnded;

    struct Proposal {
        string name;
        uint8 voteCount;
    }

    struct Question {
        string title;
        Proposal[] proposals;
    }
    
    mapping(uint8 => Question) _questions;

    uint8 _questionsCount = 0;
    
    mapping(address => bool) _voted;
    
    constructor() public {
        _chairperson = msg.sender;
        _voteStarted = false;
        _voteEnded = false;
    }

    function isChairperson() public view returns(bool) {
        return _chairperson == msg.sender;
    }    
    
    function hasVoteStarted() public view returns(bool) {
        return _voteStarted;
    }

    function hasVoteEnded() public view returns(bool) {
        return _voteEnded;
    }

    function addQuestion(string memory questionTitle) public onlyChairperson voteNotStarted {
        Question storage question = _questions[_questionsCount];
        question.title = questionTitle;
        _questionsCount++;
    }
      
    function addProposal(uint8 questionId, string memory proposalName) public onlyChairperson voteNotStarted {
        _questions[questionId].proposals.push(
            Proposal({
                name: proposalName,
                voteCount: 0
            })
        );
    }

    function startVoting() public onlyChairperson voteNotStarted votingIsValid {
        _voteStarted = true;
    }

    function hasVoted() public view notChairperson voteStarted returns(bool) {
        return _voted[msg.sender];
    }
    
    function vote(uint8[] memory proposals) public notChairperson voteStarted voteNotEnded voteOnce answeredAll(proposals.length) {
        _voted[msg.sender] = true;
        for(uint8 i=0; i < proposals.length; i++){
            _questions[i].proposals[proposals[i]].voteCount++;
        }
    }

    function endVoting() public onlyChairperson voteStarted voteNotEnded {
        _voteEnded = true;
    }

    function getQuestions() public view returns (string memory) {
        string memory res = '';

        for(uint8 i = 0; i < _questionsCount; i++){
            res = string(abi.encodePacked(res, _questions[i].title, '\n'));
            for(uint8 j = 0; j < _questions[i].proposals.length; j++){
                res = string(abi.encodePacked(res, _questions[i].proposals[j].name, '\t'));
            }
            res = string(abi.encodePacked(res, '\n'));
        } 
        return res;
    }

    function getResults() public view voteEnded returns (string memory) {
        string memory res = '';

        for(uint8 i = 0; i < _questionsCount; i++){
            for(uint8 j = 0; j < _questions[i].proposals.length; j++){
                res = string(abi.encodePacked(res, Voting.uint2str(_questions[i].proposals[j].voteCount), '\t'));
            }
            res = string(abi.encodePacked(res, '\n'));
        } 
        return res;
    }
    
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

}
