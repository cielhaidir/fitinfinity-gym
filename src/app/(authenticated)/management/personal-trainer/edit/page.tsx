import CardWithAction from "@/components/cards/CardWithAction";

const EditPT = () => {
  return (
    <>
      {/* <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" /> */}

      <h1 className="">Edit Personal Trainer</h1>
      {/* <CardWithAction>
        
      </CardWithAction> */}

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>

    </>
  );
};

export default EditPT;
