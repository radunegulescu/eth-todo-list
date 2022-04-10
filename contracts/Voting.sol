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

    function getQuestions() public view returns (string[][] memory) {
        string[][] memory questions = new string[][](_questionsCount);
        for(uint8 i = 0; i < _questionsCount; i++){
            questions[i] = new string[](1 + _questions[i].proposals.length);
            questions[i][0] = _questions[i].title;
            for(uint8 j = 0; j < _questions[i].proposals.length; j++){
                questions[i][1+j] = _questions[i].proposals[j].name;
            }
        } 
        return questions;
    }

    function getResults() public view voteEnded returns (uint8[][] memory) {
        uint8[][] memory results = new uint8[][](_questionsCount);
        for(uint8 i = 0; i < _questionsCount; i++){
            results[i] = new uint8[](_questions[i].proposals.length);
            for(uint8 j = 0; j < _questions[i].proposals.length; j++){
                results[i][j] = _questions[i].proposals[j].voteCount;
            }
        } 
        return results;
    }
}
